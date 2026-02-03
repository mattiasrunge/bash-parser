import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('special parameter substitution', async (t) => {
  await t.step('parameter with use default value', async () => {
    const result = await bashParser('${other:-default_value}');

    // utils.logResults((result as any).commands[0].name)
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '${other:-default_value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'useDefaultValue',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with use default value if unset', async () => {
    const result = await bashParser('${other-default_value}');

    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '${other-default_value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'useDefaultValueIfUnset',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with string length', async () => {
    const result = await bashParser('${#default_value}');

    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '${#default_value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'default_value',
        op: 'stringLength',
        loc: {
          start: 0,
          end: 16,
        },
      }],
    });
  });

  await t.step('parameter with assign default value', async () => {
    const result = await bashParser('${other:=default_value}');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '${other:=default_value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'assignDefaultValue',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with assign default value if unset', async () => {
    const result = await bashParser('${other=default_value}');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '${other=default_value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'assignDefaultValueIfUnset',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with other parameter in word', async () => {
    const result = await bashParser('${other:=default$value}');
    // utils.logResults(result)
    utils.checkResults(structuredClone((result as any).commands[0].name), {
      type: 'Word',
      text: '${other:=default$value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default$value',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'value',
            loc: {
              start: 7,
              end: 12,
            },
          }],
          type: 'Word',
        },
        op: 'assignDefaultValue',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with indicate error if null', async () => {
    const result = await bashParser('${other:?default_value}');
    utils.checkResults((result as any).commands[0].name, {
      text: '${other:?default_value}',
      type: 'Word',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'indicateErrorIfNull',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with indicate error if unset', async () => {
    const result = await bashParser('${other?default_value}');
    utils.checkResults((result as any).commands[0].name, {
      text: '${other?default_value}',
      type: 'Word',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'indicateErrorIfUnset',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with use alternative value', async () => {
    const result = await bashParser('${other:+default_value}');
    utils.checkResults((result as any).commands[0].name, {
      text: '${other:+default_value}',
      type: 'Word',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'useAlternativeValue',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with use alternative value if unset', async () => {
    const result = await bashParser('${other+default_value}');
    utils.checkResults((result as any).commands[0].name, {
      text: '${other+default_value}',
      type: 'Word',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default_value',
          type: 'Word',
        },
        op: 'useAlternativeValueIfUnset',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with Remove Smallest Suffix Pattern', async () => {
    const result = await bashParser('${other%default$value}');
    // utils.logResults(result)
    utils.checkResults(structuredClone((result as any).commands[0].name), {
      type: 'Word',
      text: '${other%default$value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default$value',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'value',
            loc: {
              start: 7,
              end: 12,
            },
          }],
          type: 'Word',
        },
        op: 'removeSmallestSuffixPattern',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with Remove Smallest Prefix Pattern', async () => {
    const result = await bashParser('${other#default$value}');
    // utils.logResults(result)
    utils.checkResults(structuredClone((result as any).commands[0].name), {
      type: 'Word',
      text: '${other#default$value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default$value',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'value',
            loc: {
              start: 7,
              end: 12,
            },
          }],
          type: 'Word',
        },
        op: 'removeSmallestPrefixPattern',
        loc: {
          start: 0,
          end: 21,
        },
      }],
    });
  });

  await t.step('parameter with Remove Largest Suffix Pattern', async () => {
    const result = await bashParser('${other%%default$value}');
    // utils.logResults(result)
    utils.checkResults(structuredClone((result as any).commands[0].name), {
      type: 'Word',
      text: '${other%%default$value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default$value',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'value',
            loc: {
              start: 7,
              end: 12,
            },
          }],
          type: 'Word',
        },
        op: 'removeLargestSuffixPattern',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });

  await t.step('parameter with Remove Largest Prefix Pattern', async () => {
    const result = await bashParser('${other##default$value}');
    // utils.logResults(result)
    utils.checkResults(structuredClone((result as any).commands[0].name), {
      type: 'Word',
      text: '${other##default$value}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        word: {
          text: 'default$value',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'value',
            loc: {
              start: 7,
              end: 12,
            },
          }],
          type: 'Word',
        },
        op: 'removeLargestPrefixPattern',
        loc: {
          start: 0,
          end: 22,
        },
      }],
    });
  });
});
