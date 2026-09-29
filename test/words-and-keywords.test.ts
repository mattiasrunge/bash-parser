import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';

const words = async (source: string) => (((await bashParser(source)).commands[0] as any).suffix as { text: string }[]).map((w) => w.text);

Deno.test('the function keyword', async (t) => {
  for (const source of ['function f { echo a; }', 'function f() { echo a; }', 'function f\n{ echo a; }', 'f() { echo a; }']) {
    await t.step(JSON.stringify(source), async () => {
      const command = (await bashParser(source)).commands[0] as any;
      assertEquals(command.type, 'Function');
      assertEquals(command.name.text, 'f');
    });
  }

  await t.step('a name bash allows only after the keyword', async () => {
    assertEquals(((await bashParser('function foo-bar { :; }')).commands[0] as any).name.text, 'foo-bar');
  });

  await t.step('as an argument it is a word', async () => {
    assertEquals(await words('echo function x'), ['function', 'x']);
  });
});

Deno.test('braces as words', async (t) => {
  await t.step('} closes a group only where a command could start', async () => {
    assertEquals(await words('echo { }'), ['{', '}']);
    assertEquals(await words('echo }'), ['}']);
  });

  await t.step('groups still close', async () => {
    for (const source of ['{ echo a; }', '{ echo a\n}', '{ if true; then :; fi }', 'f() { (echo a) }']) {
      await bashParser(source);
    }
  });
});

Deno.test('where a parameter expansion ends', async (t) => {
  await t.step('a quoted } or one in a substitution does not end it', async () => {
    assertEquals(await words('echo ${HOME-"}"}'), ['${HOME-"}"}']);
    assertEquals(await words('echo ${x:-$(echo })}'), ['${x:-$(echo })}']);
  });

  await t.step('plain braces do not pair, as in bash', async () => {
    assertEquals(await words('echo ${a:-G { I } K }'), ['${a:-G { I }', 'K', '}']);
  });
});

Deno.test('case item terminators', async () => {
  const result = await bashParser('case x in a) ;; b) ;& c) ;;& d) esac');
  const items = (result.commands[0] as any).cases as { terminator?: string }[];
  assertEquals(items.map((item) => item.terminator), [undefined, ';&', ';;&', undefined]);
});

Deno.test('grammar bash allows beyond POSIX', async (t) => {
  const first = async (source: string) => (await bashParser(source)).commands[0] as any;

  await t.step('select, with and without in', async () => {
    assertEquals((await first('select i in a b; do echo; done')).type, 'Select');
    assertEquals((await first('select i; do echo; done')).wordlist, undefined);
  });

  await t.step('for name; do', async () => {
    assertEquals((await first('for i; do echo; done')).type, 'For');
  });

  await t.step('(( )), a reserved word after )), a { } body for for (( ))', async () => {
    assertEquals((await first('(( ))')).type, 'ArithmeticCommand');
    assertEquals((await first('if ((1)) then ((2)) fi')).type, 'If');
    assertEquals((await first('for ((i=0; i<3; i++)) { echo $i; }')).type, 'ArithmeticFor');
  });

  await t.step('$(( )) ends after its own groups', async () => {
    const word = (await first('echo $((1 ? 20 : (x+=2)))')).suffix[0];
    assertEquals(word.expansion[0].expression, '1 ? 20 : (x+=2)');
  });

  await t.step('! counted: even cancels, alone negates nothing', async () => {
    assertEquals((await first('! ! true')).bang, undefined);
    assertEquals((await first('! ! ! true')).bang, true);
    assertEquals((await first('!')).bang, true);
  });
});
