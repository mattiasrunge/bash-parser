import { assertEquals, assertRejects } from '@std/assert';
import { BashSyntaxError, parse } from '../mod.ts';
import type { Options } from '../src/types.ts';

type Loose = Record<string, any>;

/** The commands of a script as words: each command's name and arguments. */
const words = async (source: string, options: Options = {}) => {
  const ast = await parse(source, options);

  return ast.commands.map((c: Loose) => [c.name?.text, ...(c.suffix ?? []).map((w: Loose) => w.text)]);
};

/** The first expansion of the first argument of the first command. */
const expansion = async (source: string, options: Options = {}): Promise<Loose> => {
  const ast = await parse(source, options);

  return (ast.commands[0] as Loose).suffix[0].expansion[0];
};

const aliases: Record<string, string> = { m: 'more', ll: 'ls -l', e: 'echo ', fi: 'echo', c: 'echo $(date' };
const resolveAlias = async (name: string) => aliases[name];

Deno.test('aliases expand where a command name stands', async (t) => {
  await t.step('not in an argument', async () => {
    assertEquals(await words('type m; m x', { resolveAlias }), [['type', 'm'], ['more', 'x']]);
  });

  await t.step('after an alias ending in a blank, the next word as well', async () => {
    assertEquals(await words('e m; e ll', { resolveAlias }), [['echo', 'more'], ['echo', 'ls', '-l']]);
  });

  await t.step('a reserved word too, where it stands as a command', async () => {
    assertEquals(await words('fi x', { resolveAlias }), [['echo', 'x']]);
  });

  await t.step('in a command substitution', async () => {
    const ast = await parse('echo $(m)', { resolveAlias });
    const inner = ((ast.commands[0] as Loose).suffix[0].expansion[0].commandAST as Loose).commands[0];

    assertEquals(inner.name.text, 'more');
  });

  await t.step('one whose text does not stand on its own stays the word it was', async () => {
    assertEquals(await words('c x', { resolveAlias }), [['c', 'x']]);
  });
});

Deno.test('${…} ends at its own }', async (t) => {
  await t.step('past a quoted ] in a subscript', async () => {
    assertEquals((await expansion(`echo "\${m['a]=x;#a']}"`)).parameter, "m['a]=x;#a']");
    assertEquals((await expansion('echo ${a[b[1]]:-x}')).op, 'useDefaultValue');
  });

  await t.step("in POSIX mode a ' inside double quotes is a character, bar in a pattern", async () => {
    assertEquals((await expansion(`echo "\${x+'y}'}"`)).wordSource, "'y}'");
    assertEquals((await expansion(`echo "\${x+'y}'}"`, { posix: true })).wordSource, "'y");
    assertEquals((await expansion(`echo \${x+'y}'}`, { posix: true })).wordSource, "'y}'");
    assertEquals((await expansion(`echo "\${x#'}'}"`, { posix: true })).wordSource, "'}'");
  });

  await t.step('a word may run over lines', async () => {
    assertEquals((await expansion("echo ${x+a 'b\nc' d}")).op, 'useAlternativeValueIfUnset');
  });

  await t.step('one with no } of its own is left open', async () => {
    const err = await assertRejects(() => parse('echo "${foo:-"a}"'), BashSyntaxError);

    assertEquals(err.detail, { kind: 'unclosed', closer: '}' });
  });
});

Deno.test('{name} before a redirection is where its descriptor goes', async () => {
  const ast = await parse('while read x; do :; done {fd}<f; cat {a}<<<x 3<<<y; echo {x} <f');
  const [loop, cat, echo] = ast.commands as Loose[];

  assertEquals(loop.redirections[0].numberIo.text, '{fd}');
  assertEquals(cat.suffix.map((r: Loose) => r.numberIo.text), ['{a}', '3']);
  assertEquals(echo.suffix.map((w: Loose) => w.type), ['Word', 'Redirect']);
});

Deno.test('a backslash and a newline inside double quotes are both removed', async () => {
  assertEquals(await words('echo "b\\\nar"'), [['echo', 'bar']]);
});

Deno.test('a [[ ]] word keeps how it was written, out of sight of other words', async () => {
  const ast = await parse("[[ m['$(cmd)'] -eq 1 ]]; echo 'a b'");
  const [cond, echo] = ast.commands as Loose[];

  assertEquals(cond.conditionAST.left, { type: 'ConditionalWord', text: 'm[$(cmd)]', written: "m['$(cmd)']" });
  assertEquals(echo.suffix[0], { type: 'Word', text: 'a b' });
});
