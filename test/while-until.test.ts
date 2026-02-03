import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('while-until', async (t) => {
  await t.step('parse while', async () => {
    const result = await bashParser('while true; do sleep 1; done');

    utils.checkResults(
      result,
      {
        type: 'Script',
        commands: [{
          type: 'While',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'true' },
            }],
          },
          do: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'sleep' },
              suffix: [{ type: 'Word', text: '1' }],
            }],
          },
        }],
      },
    );
  });

  await t.step('parse until', async () => {
    const result = await bashParser('until true; do sleep 1; done');
    // console.log(inspect(result, {depth:null}))
    utils.checkResults(
      result,
      {
        type: 'Script',
        commands: [{
          type: 'Until',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'true' },
            }],
          },
          do: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'sleep' },
              suffix: [{ type: 'Word', text: '1' }],
            }],
          },
        }],
      },
    );
  });
});
