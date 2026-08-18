import { assertEquals } from '@std/assert';
import { ReplaceString } from '../src/utils/replace-string.ts';
import { FIELD_MARKER, splitByIfs, unquoteWordWithProtectedRanges } from '../src/utils/unquote-with-ranges.ts';

/**
 * Substitute `value` into `text` at the placeholder `mark`, the way an executor
 * substitutes an expansion result, and split the result into fields.
 */
const splitWith = (text: string, mark: string, value: string, ifs?: string) => {
  const rs = new ReplaceString(text);
  const start = text.indexOf(mark);
  rs.replace(start, start + mark.length, value);
  return unquoteWordWithProtectedRanges(rs.text, rs.protectedRanges, ifs).values;
};

Deno.test('IFS field splitting', async (t) => {
  await t.step('default IFS splits expansion output on whitespace', () => {
    assertEquals(splitWith('$V', '$V', 'a b\tc\nd'), ['a', 'b', 'c', 'd']);
  });

  await t.step('default IFS collapses whitespace runs and trims the ends', () => {
    assertEquals(splitWith('$V', '$V', '  a   b  '), ['a', 'b']);
  });

  await t.step('quoted expansion is not split', () => {
    assertEquals(splitWith('"$V"', '$V', 'a b c'), ['a b c']);
  });

  await t.step('custom IFS splits on that character only', () => {
    assertEquals(splitWith('$V', '$V', 'a:b c:d', ':'), ['a', 'b c', 'd']);
  });

  await t.step('literal text is never field split', () => {
    assertEquals(splitWith('a:b$V', '$V', ':c', ':'), ['a:b', 'c']);
  });

  await t.step('adjacent non-whitespace separators make an empty field', () => {
    assertEquals(splitWith('$V', '$V', 'a::b', ':'), ['a', '', 'b']);
  });

  await t.step('a leading separator makes an empty first field', () => {
    assertEquals(splitWith('$V', '$V', ':a', ':'), ['', 'a']);
  });

  await t.step('a trailing separator does not make an empty last field', () => {
    assertEquals(splitWith('$V', '$V', 'a:', ':'), ['a']);
  });

  await t.step('whitespace around a separator is absorbed into it', () => {
    assertEquals(splitWith('$V', '$V', 'a : b', ': '), ['a', 'b']);
  });

  await t.step('empty IFS disables splitting', () => {
    assertEquals(splitWith('$V', '$V', 'a b:c', ''), ['a b:c']);
  });

  await t.step('a value that is all separators produces no fields', () => {
    assertEquals(splitWith('$V', '$V', '   '), []);
  });

  await t.step('newline-only IFS keeps spaces in the field', () => {
    assertEquals(splitWith('$V', '$V', 'one file.jpg\ntwo file.jpg', '\n'), ['one file.jpg', 'two file.jpg']);
  });

  await t.step('field marker splits inside quotes', () => {
    assertEquals(splitWith('"$V"', '$V', `a b${FIELD_MARKER}c d`), ['a b', 'c d']);
  });

  await t.step('field marker keeps the prefix and suffix attached', () => {
    assertEquals(splitWith('pre"$V"post', '$V', `a${FIELD_MARKER}b${FIELD_MARKER}c`), ['prea', 'b', 'cpost']);
  });

  await t.step('quotes from an expansion are data, not syntax', () => {
    assertEquals(splitWith('$V', '$V', '{"key":"a b"}'), ['{"key":"a', 'b"}']);
  });

  await t.step('a quoted expansion inside a longer word is not split', () => {
    assertEquals(splitWith('x="$V"', '$V', 'a b'), ['x=a b']);
  });
});

Deno.test('splitByIfs', async (t) => {
  await t.step('splits on whitespace by default', () => {
    assertEquals(splitByIfs('a b\tc', ' \t\n'), ['a', 'b', 'c']);
  });

  await t.step('collapses whitespace runs and trims the ends', () => {
    assertEquals(splitByIfs('  a   b  ', ' \t\n'), ['a', 'b']);
  });

  await t.step('each separator that is not whitespace delimits on its own', () => {
    assertEquals(splitByIfs('a::b', ':'), ['a', '', 'b']);
    assertEquals(splitByIfs(':a', ':'), ['', 'a']);
    assertEquals(splitByIfs('a:', ':'), ['a']);
    assertEquals(splitByIfs('a::', ':'), ['a', '']);
  });

  await t.step('whitespace around a separator is absorbed into it', () => {
    assertEquals(splitByIfs(' a : b ', ': '), ['a', 'b']);
  });

  await t.step('an empty IFS does not split', () => {
    assertEquals(splitByIfs('a b', ''), ['a b']);
  });

  await t.step('empty text has no fields', () => {
    assertEquals(splitByIfs('', ' '), []);
    assertEquals(splitByIfs('   ', ' '), []);
  });
});
