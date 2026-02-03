import utils from './_utils.ts';
// const mkloc = require('./_utils').mkloc2;
import bashParser from '../src/parse.ts';

Deno.test('loc-line-continuations', async (t) => {
  await t.step('empty line after line continuation', async () => {
    const cmd = `echo \\\n\n\necho there`;
    const result = await bashParser(cmd);

    const expected = {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: {
            text: 'echo',
            type: 'Word',
          },
        },
        {
          type: 'Command',
          name: {
            text: 'echo',
            type: 'Word',
          },
          suffix: [
            {
              text: 'there',
              type: 'Word',
            },
          ],
        },
      ],
    };
    utils.checkResults(result, expected);
  });

  await t.step('loc take into account line continuations', async () => {
    const cmd = 'echo \\\nworld';
    const result = await bashParser(cmd, { insertLOC: true });

    const expected = {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: {
            text: 'echo',
            type: 'Word',
            loc: {
              start: {
                col: 1,
                row: 1,
                char: 0,
              },
              end: {
                col: 4,
                row: 1,
                char: 3,
              },
            },
          },
          loc: {
            start: {
              col: 1,
              row: 1,
              char: 0,
            },
            end: {
              col: 5,
              row: 2,
              char: 11,
            },
          },
          suffix: [
            {
              text: 'world',
              type: 'Word',
              loc: {
                start: {
                  col: 1,
                  row: 2,
                  char: 7,
                },
                end: {
                  col: 5,
                  row: 2,
                  char: 11,
                },
              },
            },
          ],
        },
      ],
      loc: {
        start: {
          col: 1,
          row: 1,
          char: 0,
        },
        end: {
          col: 5,
          row: 2,
          char: 11,
        },
      },
    };

    utils.checkResults(result, expected);
  });
});
