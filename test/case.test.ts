import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('case', async (t) => {
  await t.step('parse case', async () => {
    const result = await bashParser('case foo in * ) echo bar;; esac');

    const expected = {
      type: 'Script',
      commands: [{
        type: 'Case',
        clause: {
          type: 'Word',
          text: 'foo',
        },
        cases: [{
          type: 'CaseItem',
          pattern: [{
            type: 'Word',
            text: '*',
            expansion: [{
              type: 'PathExpansion',
              pattern: '*',
              loc: { start: 0, end: 1 },
            }],
          }],
          body: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: 'bar' }],
            }],
          },
        }],
      }],
    };
    utils.checkResults(result, expected);
  });
});
