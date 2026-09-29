import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';

// What `[[ ]]` does to the words inside it, and where `[[` and `]]` are words at all
const condition = async (source: string) => ((await bashParser(source)).commands[0] as any).conditionAST;

Deno.test('conditional command words', async (t) => {
  await t.step('a character class is part of a regular expression', async () => {
    const ast = await condition('[[ $l =~ [[:space:]]*(a)?b ]]');
    assertEquals(ast.operator, '=~');
    assertEquals(ast.right.text, '[[:space:]]*(a)?b');
  });

  await t.step('an extglob pattern is one word, | and parentheses included', async () => {
    const ast = await condition('[[ ab/../ == @(ab|+([^/]))/..?(/) ]]');
    assertEquals(ast.right.text, '@(ab|+([^/]))/..?(/)');
  });

  await t.step('a regular expression is kept as written, for the executor to expand', async () => {
    const ast = await condition('[[ x =~ ^($p)$ ]]');
    assertEquals(ast.right.text, '^($p)$');
  });

  await t.step('a pattern put together keeps its expansions where they stand', async () => {
    const ast = await condition('[[ x == @(a|$p) ]]');
    assertEquals(ast.right.text, '@(a|$p)');
    assertEquals(ast.right.expansion[0].parameter, 'p');
    assertEquals(ast.right.expansion[0].loc.start, 4);
  });

  await t.step('grouping with parentheses still groups', async () => {
    const ast = await condition('[[ ( a == b ) && c ]]');
    assertEquals(ast.type, 'ConditionalLogicalExpression');
  });

  await t.step('! ! is negation twice, not a reserved word', async () => {
    const ast = await condition('[[ ! ! 1 -eq 1 ]]');
    assertEquals(ast.type, 'ConditionalNegation');
    assertEquals(ast.argument.type, 'ConditionalNegation');
  });

  await t.step('[[ and ]] are plain words outside a command start', async () => {
    const result = await bashParser('echo [[ a ]] b]]c');
    const words = ((result.commands[0] as any).suffix as { text: string }[]).map((w) => w.text);
    assertEquals(words, ['[[', 'a', ']]', 'b]]c']);
  });

  await t.step('a reserved word may follow ]] directly', async () => {
    const result = await bashParser('if [[ a ]] then echo y; fi');
    assertEquals(result.commands[0].type, 'If');
  });

  await t.step('! after an argument ! is an argument too', async () => {
    const result = await bashParser('t ! ! x');
    const words = ((result.commands[0] as any).suffix as { text: string }[]).map((w) => w.text);
    assertEquals(words, ['!', '!', 'x']);
  });
});

Deno.test('patterns keep their quotes for the executor', async (t) => {
  const patterns = async (source: string) =>
    (((await bashParser(source)).commands[0] as any).cases as { pattern: { text: string }[] }[]).map((item) => item.pattern.map((word) => word.text));

  await t.step('a case pattern keeps what was quoted', async () => {
    assertEquals(await patterns('case x in "a*"b|c) ;; esac'), [['"a*"b', 'c']]);
  });

  await t.step('an extended case pattern is one word, and the item still ends', async () => {
    assertEquals(await patterns('case x in *.@(c|h)) echo; ;; (d) ;; esac'), [['*.@(c|h)'], ['d']]);
  });

  await t.step('patterns of a case nested in an item', async () => {
    assertEquals(await patterns('case x in a) case y in b) ;; esac ;; e) ;; esac'), [['a'], ['e']]);
  });

  await t.step('the right-hand side of == and =~ keeps its quotes', async () => {
    assertEquals((await condition('[[ x == "a*"b ]]')).right.text, '"a*"b');
    assertEquals((await condition('[[ x =~ "a.c" ]]')).right.text, '"a.c"');
  });
});

Deno.test('a ) that the pattern did not open ends it', async () => {
  const ast = await condition('[[ ( $ts -gt 0 && $res = t) || ( $ts -eq 0 && $res = f) ]]');
  assertEquals(ast.type, 'ConditionalLogicalExpression');
});
