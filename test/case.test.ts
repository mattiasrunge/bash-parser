import bashParser from '~/parse.ts';
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
              resolved: false,
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

  /*
await t.step('parse case with compound list', async () => {
    const result = await bashParser('case foo in * ) echo foo;echo bar;; esac');

    const expected = {
        type: 'Script',
        commands: [{
            type: 'LogicalExpression',
            left: {
                type: 'Pipeline',
                commands: [{
                    type: 'Case',
                    clause: {
                        text: 'foo'
                    },
                    cases: [{
                        type: 'CaseItem',
                        pattern: [{
                            text: '*'
                        }],
                        body: {
                            type: 'CompoundList',
                            commands: [{
                                type: 'LogicalExpression',
                                left: {
                                    type: 'Pipeline',
                                    commands: [{
                                        type: 'Command',
                                        name: {text: 'echo'},
                                        suffix: [{text: 'bar'}]
                                    }]
                                }
                            }]
                        }
                    }]
                }]
            }
        }]
    };

    assertEquals(JSON.stringify(result), JSON.stringify(expected));
});
  */
});
