import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';
import { braceExpand } from '../src/utils/brace-expansion.ts';

// Each case is what bash gives
Deno.test('brace expansion', async (t) => {
  await t.step('lists, nested and side by side', () => {
    assertEquals(braceExpand('a{b,c{d,e}}f'), ['abf', 'acdf', 'acef']);
    assertEquals(braceExpand('{a,b}{1,2}'), ['a1', 'a2', 'b1', 'b2']);
    assertEquals(braceExpand('a{,}b'), ['ab', 'ab']);
  });

  await t.step('sequences, with steps, zeros and letters', () => {
    assertEquals(braceExpand('{1..10..3}'), ['1', '4', '7', '10']);
    assertEquals(braceExpand('{05..1..2}'), ['05', '03', '01']);
    assertEquals(braceExpand('{-2..2}'), ['-2', '-1', '0', '1', '2']);
    assertEquals(braceExpand('{z..v..2}'), ['z', 'x', 'v']);
    assertEquals(braceExpand('{9223372036854775806..9223372036854775807}'), ['9223372036854775806', '9223372036854775807']);
  });

  await t.step('nothing to expand stays as written', () => {
    for (const word of ['{x}', '{}', '{a..}', '"{a,b}"', '\\{a,b\\}', '${x:-a,b}', '$(echo {p,q})']) {
      assertEquals(braceExpand(word), [word]);
    }
  });

  await t.step('the parser makes words of it, expansions moved with their text', async () => {
    const command = (await bashParser('echo ${x}{1,2} {$y,z}')).commands[0] as any;
    assertEquals(command.suffix.map((word: any) => word.text), ['${x}1', '${x}2', '$y', 'z']);
    assertEquals(command.suffix.map((word: any) => word.expansion?.[0]?.loc), [{ start: 0, end: 3 }, { start: 0, end: 3 }, { start: 0, end: 1 }, undefined]);
  });

  await t.step('not in an assignment, but in an array literal; not in a pattern', async () => {
    const script = (await bashParser('y={a,b}; a=({1..2}); case x in {a,b}) ;; esac')) as any;
    assertEquals(script.commands[0].prefix[0].text, 'y={a,b}');
    assertEquals(script.commands[1].prefix[0].text.split('﷑'), ['a=(1', '2)']);
    assertEquals(script.commands[2].cases[0].pattern[0].text, '{a,b}');
  });
});
