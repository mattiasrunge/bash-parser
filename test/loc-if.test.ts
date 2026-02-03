import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('loc-if', async (t) => {
  await t.step('parse if elif else', async () => {
    const cmd = `if true; then
 echo 1;
elif false; then
 echo 3;
else
 echo 2;
fi
`;
    const result = await bashParser(cmd, { insertLOC: true });

    // utils.logResults(result)

    const expected = {
      type: 'If',
      clause: {
        type: 'CompoundList',
        commands: [
          {
            type: 'Command',
            name: {
              text: 'true',
              type: 'Word',
              loc: {
                start: {
                  col: 4,
                  row: 1,
                  char: 3,
                },
                end: {
                  col: 7,
                  row: 1,
                  char: 6,
                },
              },
            },
            loc: {
              start: {
                col: 4,
                row: 1,
                char: 3,
              },
              end: {
                col: 7,
                row: 1,
                char: 6,
              },
            },
          },
        ],
        loc: {
          start: {
            col: 4,
            row: 1,
            char: 3,
          },
          end: {
            col: 7,
            row: 1,
            char: 6,
          },
        },
      },
      then: {
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
                  row: 2,
                  char: 15,
                },
                end: {
                  col: 5,
                  row: 2,
                  char: 18,
                },
              },
            },
            loc: {
              start: {
                col: 2,
                row: 2,
                char: 15,
              },
              end: {
                col: 7,
                row: 2,
                char: 20,
              },
            },
            suffix: [
              {
                text: '1',
                type: 'Word',
                loc: {
                  start: {
                    col: 7,
                    row: 2,
                    char: 20,
                  },
                  end: {
                    col: 7,
                    row: 2,
                    char: 20,
                  },
                },
              },
            ],
          },
        ],
        loc: {
          start: {
            col: 2,
            row: 2,
            char: 15,
          },
          end: {
            col: 7,
            row: 2,
            char: 20,
          },
        },
      },
      else: {
        type: 'If',
        clause: {
          type: 'CompoundList',
          commands: [
            {
              type: 'Command',
              name: {
                text: 'false',
                type: 'Word',
                loc: {
                  start: {
                    col: 6,
                    row: 3,
                    char: 28,
                  },
                  end: {
                    col: 10,
                    row: 3,
                    char: 32,
                  },
                },
              },
              loc: {
                start: {
                  col: 6,
                  row: 3,
                  char: 28,
                },
                end: {
                  col: 10,
                  row: 3,
                  char: 32,
                },
              },
            },
          ],
          loc: {
            start: {
              col: 6,
              row: 3,
              char: 28,
            },
            end: {
              col: 10,
              row: 3,
              char: 32,
            },
          },
        },
        then: {
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
                    row: 4,
                    char: 41,
                  },
                  end: {
                    col: 5,
                    row: 4,
                    char: 44,
                  },
                },
              },
              loc: {
                start: {
                  col: 2,
                  row: 4,
                  char: 41,
                },
                end: {
                  col: 7,
                  row: 4,
                  char: 46,
                },
              },
              suffix: [
                {
                  text: '3',
                  type: 'Word',
                  loc: {
                    start: {
                      col: 7,
                      row: 4,
                      char: 46,
                    },
                    end: {
                      col: 7,
                      row: 4,
                      char: 46,
                    },
                  },
                },
              ],
            },
          ],
          loc: {
            start: {
              col: 2,
              row: 4,
              char: 41,
            },
            end: {
              col: 7,
              row: 4,
              char: 46,
            },
          },
        },
        else: {
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
                    row: 6,
                    char: 55,
                  },
                  end: {
                    col: 5,
                    row: 6,
                    char: 58,
                  },
                },
              },
              loc: {
                start: {
                  col: 2,
                  row: 6,
                  char: 55,
                },
                end: {
                  col: 7,
                  row: 6,
                  char: 60,
                },
              },
              suffix: [
                {
                  text: '2',
                  type: 'Word',
                  loc: {
                    start: {
                      col: 7,
                      row: 6,
                      char: 60,
                    },
                    end: {
                      col: 7,
                      row: 6,
                      char: 60,
                    },
                  },
                },
              ],
            },
          ],
          loc: {
            start: {
              col: 1,
              row: 5,
              char: 49,
            },
            end: {
              col: 7,
              row: 6,
              char: 60,
            },
          },
        },
        loc: {
          start: {
            col: 1,
            row: 3,
            char: 23,
          },
          end: {
            col: 7,
            row: 6,
            char: 60,
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
          col: 2,
          row: 7,
          char: 64,
        },
      },
    };
    // console.log(diff(result.commands[0].left.commands[0], expected));

    utils.checkResults(result.commands[0], expected);
  });
});
