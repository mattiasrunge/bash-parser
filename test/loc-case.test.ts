import bashParser from '../src/parse.ts';
import utils, { mkloc2 as mkloc } from './_utils.ts';

Deno.test('loc-case', async (t) => {
  await t.step('case statement has loc', async () => {
    const cmd = `case foo in
 * )
  echo bar;;
esac
`;
    const result = await bashParser(cmd, { insertLOC: true });

    const expected = {
      type: 'Case',
      clause: {
        type: 'Word',
        text: 'foo',
        loc: mkloc(1, 6, 1, 8, 5, 7),
      },
      cases: [
        {
          type: 'CaseItem',
          pattern: [
            {
              type: 'Word',
              text: '*',
              loc: mkloc(2, 2, 2, 2, 13, 13),
              expansion: [
                {
                  loc: {
                    end: 1,
                    start: 0,
                  },
                  pattern: '*',
                  resolved: false,
                  type: 'PathExpansion',
                },
              ],
            },
          ],
          body: {
            type: 'CompoundList',
            commands: [
              {
                type: 'Command',
                name: {
                  type: 'Word',
                  text: 'echo',
                  loc: mkloc(3, 3, 3, 6, 19, 22),
                },
                loc: mkloc(3, 3, 3, 10, 19, 26),
                suffix: [{
                  type: 'Word',
                  text: 'bar',
                  loc: mkloc(3, 8, 3, 10, 24, 26),
                }],
              },
            ],
            loc: mkloc(3, 3, 3, 10, 19, 26),
          },
          loc: mkloc(2, 2, 3, 12, 13, 28),
        },
      ],
      loc: mkloc(1, 1, 4, 4, 0, 33),
    };
    // utils.logResults(result.commands[0]);

    utils.checkResults(result.commands[0], expected);
  });
});
