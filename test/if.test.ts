import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('if', async (t) => {
  await t.step('parse if', async () => {
    const result = await bashParser('if true; then echo 1; fi');
    // console.log(inspect(result, {depth:null}))
    utils.checkResults(
      result,
      {
        type: 'Script',
        commands: [{
          type: 'If',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'true' },
            }],
          },
          then: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '1' }],
            }],
          },
        }],
      },
    );
  });

  await t.step('parse if else', async () => {
    const result = await bashParser('if true; then echo 1; else echo 2; fi');

    utils.checkResults(
      result,
      {
        type: 'Script',
        commands: [{
          type: 'If',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'true' },
            }],
          },
          then: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '1' }],
            }],
          },
          else: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '2' }],
            }],
          },
        }],
      },
    );
  });

  await t.step('parse if else multiline', async () => {
    const result = await bashParser('if true; then \n echo 1;\n else\n echo 2;\n fi');
    // console.log(inspect(result, {depth:null}))
    utils.checkResults(
      result,
      {
        type: 'Script',
        commands: [{
          type: 'If',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'true' },
            }],
          },
          then: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '1' }],
            }],
          },
          else: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '2' }],
            }],
          },
        }],
      },
    );
  });

  await t.step('parse if elif else', async () => {
    const result = await bashParser('if true; then echo 1; elif false; then echo 3; else echo 2; fi');

    const expected = {
      type: 'Script',
      commands: [{
        type: 'If',
        clause: {
          type: 'CompoundList',
          commands: [{
            type: 'Command',
            name: { type: 'Word', text: 'true' },
          }],
        },
        then: {
          type: 'CompoundList',
          commands: [{
            type: 'Command',
            name: { type: 'Word', text: 'echo' },
            suffix: [{ type: 'Word', text: '1' }],
          }],
        },
        else: {
          type: 'If',
          clause: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'false' },
            }],
          },
          then: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '3' }],
            }],
          },
          else: {
            type: 'CompoundList',
            commands: [{
              type: 'Command',
              name: { type: 'Word', text: 'echo' },
              suffix: [{ type: 'Word', text: '2' }],
            }],
          },
        },
      }],
    };

    // utils.logDiff(result, expected)
    utils.checkResults(result, expected);
  });
});
