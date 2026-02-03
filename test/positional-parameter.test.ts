import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('positional-parameter', async (t) => {
  await t.step('positional parameter with word following', async () => {
    const result = await bashParser('echoword=$1ciao');

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'echoword=$1ciao',
      expansion: [{
        type: 'ParameterExpansion',
        kind: 'positional',
        parameter: 1,
        loc: {
          start: 9,
          end: 10,
        },
      }],
    }]);
  });

  await t.step('positional parameter in braces', async () => {
    const result = await bashParser('echoword=${11}test');
    utils.checkResults(result, {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          prefix: [{
            type: 'AssignmentWord',
            text: 'echoword=${11}test',
            expansion: [{
              type: 'ParameterExpansion',
              parameter: 11,
              kind: 'positional',
              loc: {
                start: 9,
                end: 13,
              },
            }],
          }],
        },
      ],
    });
  });

  await t.step('positional parameter without braces', async () => {
    const result = await bashParser('echoword=$1');
    // console.log(JSON.stringify(result, null, 5))
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        prefix: [{
          type: 'AssignmentWord',
          text: 'echoword=$1',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 1,
            kind: 'positional',
            loc: {
              start: 9,
              end: 10,
            },
          }],
        }],
      }],
    });
  });

  await t.step('positional parameter without braces allow one digit only', async () => {
    const result = await bashParser('echoword=$11');
    // console.log(JSON.stringify(result, null, 5))
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        prefix: [{
          type: 'AssignmentWord',
          text: 'echoword=$11',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 1,
            kind: 'positional',
            loc: {
              start: 9,
              end: 10,
            },
          }],
        }],
      }],
    });
  });
});
