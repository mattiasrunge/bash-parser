import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('pathname-expansion', async (t) => {
  await t.step('tracks glob pattern as PathExpansion without resolver', async () => {
    const result = await bashParser('echo *.txt');
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.txt',
          loc: { start: 0, end: 5 },
        },
      ],
    });
  });
});
