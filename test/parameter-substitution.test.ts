import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('parameter-substitution', async (t) => {
  await t.step('parameter substitution in assignment', async () => {
    const result = await bashParser('echoword=${other}test');

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'echoword=${other}test',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        loc: {
          start: 9,
          end: 16,
        },
      }],
    }]);
  });

  await t.step('parameter substitution skip escaped dollar', async () => {
    const result = await bashParser('echo "\\$ciao"');
    // In bash, \$ inside double quotes becomes $ (backslash removed)
    utils.checkResults((result as any).commands[0].suffix, [{ type: 'Word', text: '$ciao' }]);
  });

  await t.step('parameter substitution skip escaped dollar with braces', async () => {
    const result = await bashParser('echo "\\${ciao}"');
    // In bash, \$ inside double quotes becomes $ (backslash removed)
    utils.checkResults((result as any).commands[0].suffix, [{ type: 'Word', text: '${ciao}' }]);
  });

  await t.step('parameter substitution skip single quoted words', async () => {
    const result = await bashParser("echo '${echo } $ciao'");
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${echo } $ciao',
    }]);
  });

  await t.step('parameter substitution and other words', async () => {
    const result = await bashParser('foo ${other} bar baz');

    utils.checkResults((result as any).commands[0].suffix, [{
      text: '${other}',
      expansion: [{
        parameter: 'other',
        loc: {
          start: 0,
          end: 7,
        },
        type: 'ParameterExpansion',
      }],
      type: 'Word',
    }, {
      text: 'bar',
      type: 'Word',
    }, {
      text: 'baz',
      type: 'Word',
    }]);
  });

  await t.step('multi-word parameter substitution', async () => {
    const result = await bashParser('echoword=${other word}test');

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'echoword=${other word}test',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other word',
        loc: {
          start: 9,
          end: 21,
        },
      }],
    }]);
  });

  await t.step('parameter substitution', async () => {
    const result = await bashParser('echo word${other}test');
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: 'word${other}test',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        loc: {
          start: 4,
          end: 11,
        },
      }],
    }]);
  });

  await t.step('multiple parameter substitution', async () => {
    const result = await bashParser('echo word${other}t$est');
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: 'word${other}t$est',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        loc: {
          start: 4,
          end: 11,
        },
      }, {
        type: 'ParameterExpansion',
        parameter: 'est',
        loc: {
          start: 13,
          end: 16,
        },
      }],
    }]);
  });

  await t.step('command consisting of only parameter substitution', async () => {
    const result = await bashParser('$other');
    utils.checkResults((result as any).commands[0].name, {
      type: 'Word',
      text: '$other',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'other',
        loc: {
          start: 0,
          end: 5,
        },
      }],
    });
  });
});
