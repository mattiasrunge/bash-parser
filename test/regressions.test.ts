import bashParser from '../src/parse.ts';
import type { AstNodeSubshell } from '../src/ast/types.ts';
import utils from './_utils.ts';

Deno.test('regressions', async (t) => {
  await t.step('A digits-only argument separated from a redirect is not an IO_NUMBER', async () => {
    // POSIX 2.10.1: an IO_NUMBER is delimited by < or > with *no intervening
    // blank*. Without that check `seq 20 > file` lost its operand to a bogus
    // fd 20 redirect and failed with "seq: missing operand".
    const result = await bashParser('seq 20 > file.txt');

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'seq' },
        suffix: [
          { type: 'Word', text: '20' },
          {
            type: 'Redirect',
            op: { type: 'Great', text: '>' },
            file: { type: 'Word', text: 'file.txt' },
          },
        ],
      }],
    });
  });

  await t.step('A digits-only argument adjacent to a redirect is still an IO_NUMBER', async () => {
    const result = await bashParser('cmd 2>&1');

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'cmd' },
        suffix: [
          {
            type: 'Redirect',
            op: { type: 'Greatand', text: '>&' },
            file: { type: 'Word', text: '1' },
            numberIo: { type: 'IoNumber', text: '2' },
          },
        ],
      }],
    });
  });

  await t.step('Redirect should be allowed immediately following argument', async () => {
    const result = await bashParser('echo foo>file.txt');

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [
          { type: 'Word', text: 'foo' },
          {
            type: 'Redirect',
            op: { type: 'Great', text: '>' },
            file: { type: 'Word', text: 'file.txt' },
          },
        ],
      }],
    });
  });

  await t.step('Equal sign should be allowed in arguments', async () => {
    const result = await bashParser('echo foo=bar');
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'foo=bar' }],
      }],
    });
  });

  await t.step('Empty string returns empty Script', async () => {
    const result = await bashParser('');
    utils.checkResults(result, {
      type: 'Script',
      commands: [],
    });
  });

  await t.step('Whitespace-only returns empty Script', async () => {
    const result = await bashParser('   \n\n   ');
    utils.checkResults(result, {
      type: 'Script',
      commands: [],
    });
  });

  await t.step('Comment-only returns empty Script', async () => {
    const result = await bashParser('# this is a comment');
    utils.checkResults(result, {
      type: 'Script',
      commands: [],
    });
  });

  await t.step('Multiple newlines return empty Script', async () => {
    const result = await bashParser('\n\n\n');
    utils.checkResults(result, {
      type: 'Script',
      commands: [],
    });
  });

  await t.step('Nested subshell with adjacent close parens', async () => {
    const result = await bashParser('(echo "outer"; (echo "inner"))');
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Subshell',
        list: {
          type: 'CompoundList',
          commands: [
            { type: 'Command', name: { type: 'Word', text: 'echo' } },
            { type: 'Subshell' },
          ],
        },
      }],
    });
  });

  await t.step('Deeply nested subshells with spaces', async () => {
    const result = await bashParser('( ( (echo) ) )');
    const outer = result.commands[0] as AstNodeSubshell;
    const middle = outer.list.commands[0] as AstNodeSubshell;
    const inner = middle.list.commands[0] as AstNodeSubshell;
    utils.checkResults(outer, { type: 'Subshell' });
    utils.checkResults(middle, { type: 'Subshell' });
    utils.checkResults(inner, { type: 'Subshell' });
  });

  await t.step('Multiple nested subshells with semicolons', async () => {
    const result = await bashParser('(a; (b; (c)))');
    utils.checkResults(result.commands[0], { type: 'Subshell' });
  });

  await t.step('Arithmetic command still works', async () => {
    const result = await bashParser('(( x + 1 ))');
    utils.checkResults(result.commands[0], { type: 'ArithmeticCommand' });
  });

  await t.step('Arithmetic inside subshell', async () => {
    const result = await bashParser('(echo $((1+2)))');
    utils.checkResults(result.commands[0], { type: 'Subshell' });
  });
});
