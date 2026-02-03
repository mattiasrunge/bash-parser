import { assert, assertRejects } from '@std/assert';
import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

const mkloc = utils.mkloc2;

Deno.test('loc', async (t) => {
  await t.step('syntax error contains line number', async () => {
    const error = (await assertRejects(() => bashParser('ecoh\necho <'))) as Error;

    assert(
      error.message.includes(
        "Parse error on line 2: Unexpected 'EOF'",
      ),
    );
  });

  await t.step('AST can include loc', async () => {
    const result = await bashParser('echo', { insertLOC: true });
    // utils.logResults(result)
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: 'echo',
      loc: mkloc(1, 1, 1, 4, 0, 3),
    });
  });

  await t.step('subshell can include loc', async () => {
    const result = await bashParser('(echo)', { insertLOC: true });

    utils.checkResults(result, {
      type: 'Script',
      commands: [
        {
          type: 'Subshell',
          list: {
            type: 'CompoundList',
            commands: [
              {
                type: 'Command',
                name: {
                  text: 'echo',
                  type: 'Word',
                  loc: mkloc(1, 2, 1, 5, 1, 4),
                },
                loc: mkloc(1, 2, 1, 5, 1, 4),
              },
            ],
            loc: mkloc(1, 2, 1, 5, 1, 4),
          },
          loc: mkloc(1, 1, 1, 6, 0, 5),
        },
      ],
      loc: mkloc(1, 1, 1, 6, 0, 5),
    });
  });

  await t.step('double command with only name', async () => {
    const result = await bashParser('echo; ciao;', { insertLOC: true });

    utils.checkResults(result, {
      type: 'Script',
      loc: mkloc(1, 1, 1, 10, 0, 9),
      commands: [
        {
          type: 'Command',
          name: {
            type: 'Word',
            text: 'echo',
            loc: mkloc(1, 1, 1, 4, 0, 3),
          },
          loc: mkloc(1, 1, 1, 4, 0, 3),
        },
        {
          type: 'Command',
          name: {
            type: 'Word',
            text: 'ciao',
            loc: mkloc(1, 7, 1, 10, 6, 9),
          },
          loc: mkloc(1, 7, 1, 10, 6, 9),
        },
      ],
    });
  });

  await t.step('loc are composed by all tokens', async () => {
    const result = await bashParser('echo 42', { insertLOC: true });
    // console.log(JSON.stringify(result, null, 4));
    utils.checkResults(result.commands[0], {
      type: 'Command',
      name: {
        type: 'Word',
        text: 'echo',
        loc: mkloc(1, 1, 1, 4, 0, 3),
      },
      loc: mkloc(1, 1, 1, 7, 0, 6),
      suffix: [
        {
          type: 'Word',
          text: '42',
          loc: mkloc(1, 6, 1, 7, 5, 6),
        },
      ],
    });
  });

  await t.step('loc works with multiple newlines', async () => {
    const result = await bashParser('\n\n\necho 42', { insertLOC: true });
    utils.checkResults(result.commands[0], {
      type: 'Command',
      name: {
        type: 'Word',
        text: 'echo',
        loc: mkloc(4, 1, 4, 4, 3, 6),
      },
      loc: mkloc(4, 1, 4, 7, 3, 9),
      suffix: [
        {
          type: 'Word',
          text: '42',
          loc: mkloc(4, 6, 4, 7, 8, 9),
        },
      ],
    });
  });

  await t.step('loc with LINEBREAK_IN statement', async () => {
    const cmd = `for x
 in ; do
 echo $x;
done
`;

    const result = await bashParser(cmd, { insertLOC: true });
    // utils.logResults(result)
    const expected = {
      type: 'For',
      name: {
        text: 'x',
        type: 'Name',
        loc: {
          start: {
            col: 5,
            row: 1,
            char: 4,
          },
          end: {
            col: 5,
            row: 1,
            char: 4,
          },
        },
      },
      do: {
        type: 'CompoundList',
        commands: [
          {
            type: 'Command',
            name: {
              text: 'echo',
              type: 'Word',
              loc: {
                start: {
                  col: 2,
                  row: 3,
                  char: 16,
                },
                end: {
                  col: 5,
                  row: 3,
                  char: 19,
                },
              },
            },
            loc: {
              start: {
                col: 2,
                row: 3,
                char: 16,
              },
              end: {
                col: 8,
                row: 3,
                char: 22,
              },
            },
            suffix: [
              {
                text: '$x',
                expansion: [
                  {
                    loc: {
                      start: 0,
                      end: 1,
                    },
                    parameter: 'x',
                    type: 'ParameterExpansion',
                  },
                ],
                type: 'Word',
                loc: {
                  start: {
                    col: 7,
                    row: 3,
                    char: 21,
                  },
                  end: {
                    col: 8,
                    row: 3,
                    char: 22,
                  },
                },
              },
            ],
          },
        ],
        loc: {
          start: {
            col: 7,
            row: 2,
            char: 12,
          },
          end: {
            col: 4,
            row: 4,
            char: 28,
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
          col: 4,
          row: 4,
          char: 28,
        },
      },
    };

    utils.checkResults(result.commands[0], expected);
  });

  await t.step('loc in multi line commands', async () => {
    const result = await bashParser('echo;\nls;\n', { insertLOC: true });

    utils.checkResults(result, {
      loc: mkloc(1, 1, 2, 2, 0, 7),
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: {
            type: 'Word',
            text: 'echo',
            loc: mkloc(1, 1, 1, 4, 0, 3),
          },
          loc: mkloc(1, 1, 1, 4, 0, 3),
        },
        {
          type: 'Command',
          name: {
            type: 'Word',
            text: 'ls',
            loc: mkloc(2, 1, 2, 2, 6, 7),
          },
          loc: mkloc(2, 1, 2, 2, 6, 7),
        },
      ],
    });
  });
});
