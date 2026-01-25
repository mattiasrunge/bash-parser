import bashParser from '~/parse.ts';
import utils from './_utils.ts';

Deno.test('word-expansion-mode', async (t) => {
  await t.step('expand on a single word', async () => {
    const result = await bashParser('ls $var > res.txt', {
      mode: 'word-expansion',
    });

    utils.checkResults({
      type: 'Script',
      commands: [{
        type: 'Command',
        name: {
          type: 'Word',
          text: 'ls $var > res.txt',
          expansion: [{
            parameter: 'var',
            loc: {
              start: 3,
              end: 6,
            },
            type: 'ParameterExpansion',
          }],
        },
      }],
    }, result);
  });

  await t.step('handles empty input', async () => {
    const result = await bashParser('', {
      mode: 'word-expansion',
    });
    utils.checkResults({
      type: 'Script',
      commands: [],
    }, result);
  });

  await t.step('handles single quoted string', async () => {
    const result = await bashParser("'hello world'", {
      mode: 'word-expansion',
    });
    utils.checkResults({
      type: 'Script',
      commands: [{
        type: 'Command',
        name: {
          type: 'Word',
          text: 'hello world',
        },
      }],
    }, result);
  });

  await t.step('handles double quoted string with expansion', async () => {
    const result = await bashParser('"hello $var"', {
      mode: 'word-expansion',
    });
    // In word expansion mode, text includes quotes when unresolved
    // Just verify the expansion is present
    const name = (result as any).commands[0].name;
    utils.checkResults(name, {
      type: 'Word',
      text: '"hello $var"',
    });
    utils.checkResults(name.expansion[0], {
      parameter: 'var',
      type: 'ParameterExpansion',
    });
  });

  await t.step('handles backslash escaping', async () => {
    const result = await bashParser('hello\\ world', {
      mode: 'word-expansion',
    });
    utils.checkResults({
      type: 'Script',
      commands: [{
        type: 'Command',
        name: {
          type: 'Word',
          text: 'hello world',
        },
      }],
    }, result);
  });

  await t.step('handles line continuation (backslash newline)', async () => {
    const result = await bashParser('hello\\\nworld', {
      mode: 'word-expansion',
    });
    utils.checkResults({
      type: 'Script',
      commands: [{
        type: 'Command',
        name: {
          type: 'Word',
          text: 'helloworld',
        },
      }],
    }, result);
  });

  await t.step('handles backtick command substitution', async () => {
    const result = await bashParser('`echo hi`', {
      mode: 'word-expansion',
    });
    // Verify expansion is present
    const expansion = (result as any).commands[0].name.expansion[0];
    utils.checkResults(expansion, {
      command: 'echo hi',
      type: 'CommandExpansion',
    });
  });

  await t.step('handles dollar command substitution', async () => {
    const result = await bashParser('$(echo hi)', {
      mode: 'word-expansion',
    });
    // Verify expansion is present
    const expansion = (result as any).commands[0].name.expansion[0];
    utils.checkResults(expansion, {
      command: 'echo hi',
      type: 'CommandExpansion',
    });
  });

  await t.step('handles plain text', async () => {
    // In word expansion mode, text without special chars is treated as a single word
    const result = await bashParser('plaintext', {
      mode: 'word-expansion',
    });
    utils.checkResults({
      type: 'Script',
      commands: [{
        type: 'Command',
        name: {
          type: 'Word',
          text: 'plaintext',
        },
      }],
    }, result);
  });

  await t.step('handles arithmetic expansion', async () => {
    const result = await bashParser('$((1+2))', {
      mode: 'word-expansion',
    });
    // Verify expansion is present
    const expansion = (result as any).commands[0].name.expansion[0];
    utils.checkResults(expansion, {
      expression: '1+2',
      type: 'ArithmeticExpansion',
    });
  });
});
