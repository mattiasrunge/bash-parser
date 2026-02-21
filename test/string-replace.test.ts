import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('string replace parameter expansion', async (t) => {
  await t.step('global string replace ${var//pattern/replacement}', async () => {
    const result = await bashParser('echo ${var//foo/bar}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${var//foo/bar}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'var',
        op: 'stringReplace',
        substitute: 'o',
        replace: 'bar',
        globally: true,
      }],
    }]);
  });

  await t.step('single string replace ${var/pattern/replacement}', async () => {
    const result = await bashParser('echo ${var/foo/bar}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${var/foo/bar}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'var',
        op: 'stringReplace',
        substitute: 'o',
        replace: 'bar',
        globally: false,
      }],
    }]);
  });

  await t.step('global replace with empty replacement ${var// /}', async () => {
    const result = await bashParser('echo ${var// /}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${var// /}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'var',
        op: 'stringReplace',
        substitute: ' ',
        replace: '',
        globally: true,
      }],
    }]);
  });

  await t.step('replace with multi-char pattern ${var//abc/xyz}', async () => {
    const result = await bashParser('echo ${var//abc/xyz}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${var//abc/xyz}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'var',
        op: 'stringReplace',
        globally: true,
      }],
    }]);
  });

  await t.step('in assignment context', async () => {
    const result = await bashParser('x="${year// /}"');

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'x="${year// /}"',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'year',
        op: 'stringReplace',
        substitute: ' ',
        replace: '',
        globally: true,
      }],
    }]);
  });
});

Deno.test('nested parameter expansions with braces', async (t) => {
  await t.step('${a:-${b}}', async () => {
    const result = await bashParser('echo ${a:-${b}}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${a:-${b}}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'a',
        op: 'useDefaultValue',
        word: {
          text: '${b}',
          type: 'Word',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'b',
          }],
        },
      }],
    }]);
  });

  await t.step('${a:-${b:-${c:-$d}}}', async () => {
    const result = await bashParser('echo ${a:-${b:-${c:-$d}}}');

    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '${a:-${b:-${c:-$d}}}',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'a',
        op: 'useDefaultValue',
      }],
    }]);
  });

  await t.step('${a:-${b}} in assignment', async () => {
    const result = await bashParser('x="${a:-${b}}"');

    utils.checkResults((result as any).commands[0].prefix, [{
      type: 'AssignmentWord',
      text: 'x="${a:-${b}}"',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'a',
        op: 'useDefaultValue',
        word: {
          text: '${b}',
          type: 'Word',
          expansion: [{
            type: 'ParameterExpansion',
            parameter: 'b',
          }],
        },
      }],
    }]);
  });
});
