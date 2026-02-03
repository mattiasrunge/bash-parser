import bashParser from '~/parse.ts';
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

  await t.step('transform escaped characters', async () => {
    const result = await bashParser('"ec\\t\\nho"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec\t\nho',
    });
  });

  await t.step('not remove special characters', async () => {
    const result = await bashParser('"ec\tho"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'ec\tho',
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

  await t.step('handles backslash-n escape sequence', async () => {
    const result = await bashParser('"line1\\nline2"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'line1\nline2',
    });
  });

  await t.step('handles backslash-t escape sequence', async () => {
    const result = await bashParser('"col1\\tcol2"');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'col1\tcol2',
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
