import { assert, assertRejects } from '@std/assert';
import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('command substitution', async (t) => {
  await t.step('command substitution', async () => {
    const result = await bashParser('variable=$(echo ciao)');
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'variable=$(echo ciao)',
      expansion: [{
        command: 'echo ciao',
        type: 'CommandExpansion',
        loc: {
          start: 9,
          end: 20,
        },
      }],
    }]);
  });

  await t.step('command substitution skip escaped dollar', async () => {
    const result = await bashParser('echo "\\$\\(echo ciao)"');
    // In bash, \$ inside double quotes becomes $ (backslash removed)
    // \( stays as \( since ( is not a special char inside double quotes
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '$\\(echo ciao)',
    }]);
  });

  await t.step('command substitution skip escaped backtick', async () => {
    const err = (await assertRejects(() => bashParser('echo "\\`echo ciao`"'))) as Error;
    assert(err.message, 'Unclosed `');
  });

  await t.step('command substitution skip single quoted words', async () => {
    const result = await bashParser("echo '$(echo ciao)'");
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '$(echo ciao)',
    }]);
  });

  await t.step('command substitution with backticks skip single quoted words', async () => {
    const result = await bashParser("echo '`echo ciao`'");
    utils.checkResults((result as any).commands[0].suffix, [{ type: 'Word', text: '`echo ciao`' }]);
  });

  await t.step('command substitution in suffix', async () => {
    const result = await bashParser('echo $(ciao)');
    delete (result as any).commands[0].suffix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '$(ciao)',
      expansion: [{
        command: 'ciao',
        type: 'CommandExpansion',
        loc: {
          start: 0,
          end: 6,
        },
      }],
    }]);
  });

  await t.step('command substitution in suffix with backticks', async () => {
    const result = await bashParser('echo `ciao`');
    delete (result as any).commands[0].suffix[0].expansion[0].commandAST;

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '`ciao`',
      expansion: [{
        command: 'ciao',
        type: 'CommandExpansion',
        loc: {
          start: 0,
          end: 5,
        },
      }],
    }]);
  });

  await t.step('command ast is recursively parsed', async () => {
    const result = await bashParser('variable=$(echo ciao)');

    utils.checkResults((result as any).commands[0].prefix[0].expansion[0].commandAST, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'ciao' }],
      }],
    });
  });

  await t.step('command substitution with backticks', async () => {
    const result = await bashParser('variable=`echo ciao`');
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'variable=`echo ciao`',
      expansion: [{
        command: 'echo ciao',
        type: 'CommandExpansion',
        loc: {
          start: 9,
          end: 19,
        },
      }],
    }]);
  });

  await t.step('quoted backtick are removed within command substitution with backticks', async () => {
    const result = await bashParser('variable=`echo \\`echo ciao\\``');
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'variable=`echo \\`echo ciao\\``',
      expansion: [{
        command: 'echo `echo ciao`',
        type: 'CommandExpansion',
        loc: {
          start: 9,
          end: 28,
        },
      }],
    }]);
  });

  await t.step('quoted backtick are not removed within command substitution with parenthesis', async () => {
    const result = await bashParser('variable=$(echo \\`echo ciao\\`)');
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'variable=$(echo \\`echo ciao\\`)',
      expansion: [{
        command: 'echo \\`echo ciao\\`',
        type: 'CommandExpansion',
        loc: {
          start: 9,
          end: 29,
        },
      }],
    }]);
  });

  await t.step('nested command substitution', async () => {
    const result = await bashParser('echo $(echo $(echo deep))');
    const expansion = (result as any).commands[0].suffix[0].expansion[0];
    utils.checkResults(expansion.command, 'echo $(echo deep)');
    utils.checkResults(expansion.type, 'CommandExpansion');

    // Verify the inner command is also recursively parsed
    const innerExpansion = expansion.commandAST.commands[0].suffix[0].expansion[0];
    utils.checkResults(innerExpansion.command, 'echo deep');
    utils.checkResults(innerExpansion.type, 'CommandExpansion');
  });

  await t.step('nested command substitution with multiple levels', async () => {
    const result = await bashParser('x=$(cat $(echo $(pwd)/file.txt))');
    const expansion = (result as any).commands[0].prefix[0].expansion[0];
    utils.checkResults(expansion.command, 'cat $(echo $(pwd)/file.txt)');
    utils.checkResults(expansion.type, 'CommandExpansion');
  });

  await t.step('nested command substitution with parentheses in command', async () => {
    const result = await bashParser('echo $(test $(echo a) = $(echo a) && echo yes)');
    const expansion = (result as any).commands[0].suffix[0].expansion[0];
    utils.checkResults(expansion.command, 'test $(echo a) = $(echo a) && echo yes');
    utils.checkResults(expansion.type, 'CommandExpansion');
  });

  await t.step('command substitution with assignment inside', async () => {
    // This tests the case where the command inside $() contains an assignment (VAR=value)
    // The parser should correctly handle the = sign inside the command substitution
    const result = await bashParser('STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")');

    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")',
      expansion: [{
        command: 'JSON_OUTPUT=1 file-stat "$FILENAME"',
        type: 'CommandExpansion',
        loc: {
          start: 12,
          end: 49,
        },
      }],
    }]);
  });

  await t.step('command substitution with assignment inside in multi-line', async () => {
    // This tests the case where the command inside $() contains an assignment (VAR=value)
    // The parser should correctly handle the = sign inside the command substitution
    const result = await bashParser(`
    
      STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")`);
    console.log(JSON.stringify(result, null, 2));
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")',
      expansion: [{
        command: 'JSON_OUTPUT=1 file-stat "$FILENAME"',
        type: 'CommandExpansion',
        loc: {
          start: 12,
          end: 49,
        },
      }],
    }]);
  });

  await t.step('command substitution with multiple assignments inside', async () => {
    // Tests multiple assignments in the command prefix inside $()
    const result = await bashParser('RESULT=$(FOO=1 BAR=2 my-command arg)');
    delete (result as any).commands[0].prefix[0].expansion[0].commandAST;
    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'RESULT=$(FOO=1 BAR=2 my-command arg)',
      expansion: [{
        command: 'FOO=1 BAR=2 my-command arg',
        type: 'CommandExpansion',
        loc: {
          start: 7,
          end: 35,
        },
      }],
    }]);
  });

  await t.step('command substitution with assignment in multiline script', async () => {
    // Tests the same case but in the context of a larger script
    const script = `#!/bin/bash

if [ -z "$FILENAME" ]; then
  echo "missing filename"
  exit 1
fi

STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")
if [ $? -ne 0 ]; then
  echo "failed" >&2
  exit 1
fi`;
    const result = await bashParser(script);

    // Find the assignment command (STAT_OUTPUT=...)
    // It should be the 3rd command (after the if-then-fi block)
    const assignmentCmd = (result as any).commands[1];
    assert(assignmentCmd.prefix, 'Assignment command should have prefix');
    assert(assignmentCmd.prefix[0], 'Prefix should have first element');
    delete assignmentCmd.prefix[0].expansion[0].commandAST;
    utils.checkResults(assignmentCmd.prefix, [{
      type: 'AssignmentWord',
      text: 'STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")',
      expansion: [{
        command: 'JSON_OUTPUT=1 file-stat "$FILENAME"',
        type: 'CommandExpansion',
        loc: {
          start: 12,
          end: 49,
        },
      }],
    }]);
  });
});
