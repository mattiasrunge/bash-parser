import { unquoteAssignmentWithProtectedRanges, unquoteWordWithProtectedRanges } from '../src/utils/unquote-with-ranges.ts';
import utils from './_utils.ts';

/** A range covering the whole string — what an expansion that filled the word looks like. */
const whole = (text: string) => [{ start: 0, end: text.length }] as never;

Deno.test('unquote-with-ranges', async (t) => {
  await t.step('metacharacters from an expansion stay literal', () => {
    // Operators are recognised when the input is tokenized, not again on what an
    // expansion produced: `A='x>y'; echo $A` prints x>y, it does not redirect.
    for (const char of ['|', '&', ';', '(', ')', '<', '>']) {
      const text = `a${char}b`;
      utils.checkResults(unquoteWordWithProtectedRanges(text, whole(text)), { values: [text] });
    }

    const geometry = '-resize 1600x1600>';
    utils.checkResults(unquoteWordWithProtectedRanges(geometry, whole(geometry)), {
      values: ['-resize', '1600x1600>'],
    });
  });

  await t.step('word splitting on whitespace still happens', () => {
    const text = 'a b\tc';
    utils.checkResults(unquoteWordWithProtectedRanges(text, whole(text)), { values: ['a', 'b', 'c'] });
  });

  await t.step('quotes from an expansion are preserved', () => {
    const text = '{"key":"value"}';
    utils.checkResults(unquoteWordWithProtectedRanges(text, whole(text)), { values: [text] });
  });

  await t.step('metacharacters outside a protected range still terminate a word', () => {
    utils.checkResults(unquoteWordWithProtectedRanges('a>b', []), { values: ['a', 'b'] });
  });

  await t.step('assignment values keep metacharacters and are not split', () => {
    const text = 'x>y z|w';
    utils.checkResults({ values: [unquoteAssignmentWithProtectedRanges(text, whole(text))] }, { values: [text] });
  });
});
