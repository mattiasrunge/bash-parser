import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';
import { unquoteSingleWord } from '../src/utils/unquote-word.ts';
import utils from './_utils.ts';

Deno.test('quote-removal', async (t) => {
  await t.step('remove double quote from string', async () => {
    const result = await bashParser('"echo"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'echo',
    });
  });

  await t.step('remove single quotes from string', async () => {
    const result = await bashParser("'echo'");
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'echo',
    });
  });

  await t.step('remove unnecessary slashes from string', async () => {
    const result = await bashParser('ec\\%ho');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec%ho',
    });
  });

  await t.step('not remove quotes from middle of string if escaped', async () => {
    const result = await bashParser('ec\\\'\\"ho');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec\'"ho',
    });
  });

  await t.step('keep escaped characters literal, as bash does', async () => {
    // Only $'…' decodes escape sequences; inside double quotes a backslash
    // before anything but " \ $ ` is a backslash
    const result = await bashParser('"ec\\t\\nho"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec\\t\\nho',
    });
  });

  await t.step('not remove special characters', async () => {
    const result = await bashParser('"ec\tho"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec\tho',
    });
  });

  await t.step('single quotes are literal (no escape processing)', async () => {
    // Bash single quotes are fully literal: backslash sequences must be preserved
    // verbatim, e.g. \1 must NOT become an octal control char.
    const backref = await bashParser("echo 's/(a)/\\1/'");
    utils.checkResults((backref as any).commands[0].suffix[0], {
      type: 'Word',
      text: 's/(a)/\\1/',
    });

    const escapes = await bashParser("echo 'a\\n\\t\\\\b'");
    utils.checkResults((escapes as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'a\\n\\t\\\\b',
    });
  });

  await t.step('remove quotes from middle of string', async () => {
    const result = await bashParser("ec'h'o");
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'echo',
    });
  });

  await t.step('remove quotes on assignment', async () => {
    const result = await bashParser('echo="ciao mondo"');
    utils.checkResults((result as any).commands[0].prefix[0], {
      text: 'echo=ciao mondo',
      type: 'AssignmentWord',
    });
  });

  await t.step('remove quotes followed by single quotes', async () => {
    const result = await bashParser('echo"ciao"\'mondo\'');
    utils.checkResults((result as any).commands[0].name, {
      text: 'echociaomondo',
      type: 'Word',
    });
  });

  await t.step('remove single quotes followed by quotes', async () => {
    const result = await bashParser('echo\'ciao\'"mondo"');
    utils.checkResults((result as any).commands[0].name, {
      text: 'echociaomondo',
      type: 'Word',
    });
  });

  await t.step('handles empty quoted string', async () => {
    const result = await bashParser('echo ""');
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '',
    });
  });

  await t.step('handles empty single quoted string', async () => {
    const result = await bashParser("echo ''");
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '',
    });
  });

  await t.step('preserves quotes when expansion is unresolved', async () => {
    const result = await bashParser('"$var"');
    // When expansion is unresolved, quotes are preserved
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '"$var"',
      expansion: [{
        parameter: 'var',
        type: 'ParameterExpansion',
      }],
    });
  });

  await t.step('removes quotes when expansion is resolved', async () => {
    const result = await bashParser('"$var"', {
      async resolveParameter() {
        return 'resolved';
      },
    });
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'resolved',
    });
  });

  await t.step('handles nested quotes properly', async () => {
    const result = await bashParser('"outer\'inner\'outer"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: "outer'inner'outer",
    });
  });

  await t.step('handles single quote inside double quotes', async () => {
    const result = await bashParser('"it\'s"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: "it's",
    });
  });

  await t.step('handles escaped dollar in double quotes', async () => {
    const result = await bashParser('"foo\\$bar"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'foo$bar',
    });
  });

  await t.step('keeps a backslash-n sequence literal', async () => {
    const result = await bashParser('"line1\\nline2"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'line1\\nline2',
    });
  });

  await t.step("a newline comes from $'…' instead", async () => {
    const result = await bashParser("$'line1\\nline2'");
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'line1\nline2',
    });
  });

  await t.step('handles consecutive quoted sections', async () => {
    const result = await bashParser("'first''second'");
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'firstsecond',
    });
  });

  await t.step('handles mixed quote styles', async () => {
    const result = await bashParser('\'single\'"double"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'singledouble',
    });
  });

  await t.step('does not process non-WORD tokens', async () => {
    const result = await bashParser('echo hello');
    // The command name is a word, check it was processed
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'echo',
    });
  });

  await t.step('preserves quotes in JSON from variable expansion', async () => {
    // This tests the case where a variable contains JSON with quotes.
    // The outer quotes are bash syntax and should be removed,
    // but the quotes inside the JSON (from expansion) should be preserved.
    const result = await bashParser('echo "$JSON_DATA"', {
      async resolveParameter() {
        return '{"uri":"file:///path","name":"test"}';
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '{"uri":"file:///path","name":"test"}',
    });
  });

  await t.step('preserves single quotes in variable expansion', async () => {
    const result = await bashParser('echo "$DATA"', {
      async resolveParameter() {
        return "it's a test";
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: "it's a test",
    });
  });

  await t.step('preserves backslashes in variable expansion', async () => {
    const result = await bashParser('echo "$PATH_DATA"', {
      async resolveParameter() {
        return 'C:\\Users\\test';
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'C:\\Users\\test',
    });
  });
});

/**
 * Quote removal works on one word at a time.
 *
 * It used to run `unquoteWord` — which parses a whole *command line* — over a
 * token the tokenizer had already delimited. That did two kinds of damage: the
 * word was split a second time and only the first field survived, and a `#` in
 * it was read as the start of a comment.
 */
Deno.test('quote removal takes the word as one word', async (t) => {
  const wordsOf = async (source: string): Promise<string[]> => {
    const ast = await bashParser(source);
    // deno-lint-ignore no-explicit-any
    const command = (ast as any).commands[0];

    // deno-lint-ignore no-explicit-any
    return [command.name.text, ...(command.suffix ?? []).map((w: any) => w.text)];
  };

  await t.step('a # inside a word is data, not a comment', async () => {
    // `echo red=#fff` printed nothing at all: the word became the empty string
    assertEquals(await wordsOf('echo a#b'), ['echo', 'a#b']);
    assertEquals(await wordsOf('echo red=#fff'), ['echo', 'red=#fff']);
    assertEquals(await wordsOf('echo "#tag"'), ['echo', '#tag']);
  });

  await t.step('a real comment is still one, because the tokenizer takes it', async () => {
    assertEquals(await wordsOf('echo a # b'), ['echo', 'a']);
    assertEquals(await wordsOf('echo a #b'), ['echo', 'a']);
  });

  await t.step('unquoteSingleWord removes quotes and nothing else', () => {
    assertEquals(unquoteSingleWord('a"b c"d'), 'ab cd');
    assertEquals(unquoteSingleWord("'a b'"), 'a b');
    assertEquals(unquoteSingleWord('a\\ b'), 'a b');
    assertEquals(unquoteSingleWord("$'a\\tb'"), 'a\tb');
  });

  await t.step('unquoteSingleWord keeps blanks, metacharacters and #', () => {
    assertEquals(unquoteSingleWord('custom message'), 'custom message');
    assertEquals(unquoteSingleWord('a  b'), 'a  b');
    assertEquals(unquoteSingleWord('a>b|c;d'), 'a>b|c;d');
    assertEquals(unquoteSingleWord('a#b'), 'a#b');
  });
});

Deno.test('a word given to ${x:-…} keeps all of itself', async (t) => {
  const wordOf = async (source: string) => {
    const result = await bashParser(source);

    // deno-lint-ignore no-explicit-any
    return (result as any).commands[0].name.expansion[0].word;
  };

  await t.step('blanks, runs of blanks, and quotes inside it', async () => {
    assertEquals((await wordOf('${x:?must be set}')).text, 'must be set');
    assertEquals((await wordOf('${x:-a  b}')).text, 'a  b');
    assertEquals((await wordOf('${x:-a "b c" d}')).text, 'a b c d');
  });

  await t.step('metacharacters, which are not operators here', async () => {
    assertEquals((await wordOf('${x:-a>b}')).text, 'a>b');
    assertEquals((await wordOf('${x:-a|b}')).text, 'a|b');
  });
});
