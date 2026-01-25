import bashParser from '~/parse.ts';
import type { AstNodeSubshell } from '~/ast/types.ts';
import utils from './_utils.ts';

Deno.test('regressions', async (t) => {
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
