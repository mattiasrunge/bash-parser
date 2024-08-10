import bashParser from '~/parse.ts';
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
            op: { type: 'great', text: '>' },
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
});
