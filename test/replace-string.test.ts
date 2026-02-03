import { assertEquals, assertThrows } from '@std/assert';
import { ReplaceString } from '../src/utils/replace-string.ts';

Deno.test('ReplaceString', async (t) => {
  await t.step('initial text is preserved', () => {
    const rs = new ReplaceString('hello world');
    assertEquals(rs.text, 'hello world');
  });

  await t.step('replace in middle', () => {
    const rs = new ReplaceString('hello world');
    rs.replace(6, 11, 'there');
    assertEquals(rs.text, 'hello there');
  });

  await t.step('replace at start', () => {
    const rs = new ReplaceString('hello world');
    rs.replace(0, 5, 'hi');
    assertEquals(rs.text, 'hi world');
  });

  await t.step('replace at end', () => {
    const rs = new ReplaceString('hello world');
    rs.replace(6, 11, 'universe');
    assertEquals(rs.text, 'hello universe');
  });

  await t.step('replace entire string', () => {
    const rs = new ReplaceString('hello');
    rs.replace(0, 5, 'goodbye');
    assertEquals(rs.text, 'goodbye');
  });

  await t.step('replace with empty string (deletion)', () => {
    const rs = new ReplaceString('hello world');
    rs.replace(5, 11, '');
    assertEquals(rs.text, 'hello');
  });

  await t.step('replace with longer text', () => {
    const rs = new ReplaceString('abc');
    rs.replace(1, 2, 'xyz');
    assertEquals(rs.text, 'axyzc');
  });

  await t.step('replace with shorter text', () => {
    const rs = new ReplaceString('abcdef');
    rs.replace(1, 5, 'x');
    assertEquals(rs.text, 'axf');
  });

  await t.step('multiple non-overlapping replacements', () => {
    const rs = new ReplaceString('hello world today');
    rs.replace(0, 5, 'hi');
    rs.replace(6, 11, 'there');
    assertEquals(rs.text, 'hi there today');
  });

  await t.step('replacement in already replaced chunk succeeds', () => {
    const rs = new ReplaceString('hello world');
    rs.replace(6, 11, 'there'); // 'hello there'
    // The chunk structure is now: [hello ][there][]
    // Can still replace in the prefix chunk
    rs.replace(0, 5, 'hi');
    assertEquals(rs.text, 'hi there');
  });

  await t.step('negative start is ignored', () => {
    const rs = new ReplaceString('hello');
    rs.replace(-1, 3, 'x');
    assertEquals(rs.text, 'hello');
  });

  await t.step('negative end is ignored', () => {
    const rs = new ReplaceString('hello');
    rs.replace(0, -1, 'x');
    assertEquals(rs.text, 'hello');
  });

  await t.step('throws on invalid range not found in chunks', () => {
    const rs = new ReplaceString('hello');
    rs.replace(0, 3, 'x'); // Creates chunks: [][x][lo]
    // Now trying to replace across chunks should fail
    assertThrows(
      () => rs.replace(0, 5, 'y'),
      Error,
      'Invalid range',
    );
  });

  await t.step('empty string input', () => {
    const rs = new ReplaceString('');
    assertEquals(rs.text, '');
  });

  await t.step('insert at position 0 in empty string', () => {
    const rs = new ReplaceString('');
    rs.replace(0, 0, 'hello');
    assertEquals(rs.text, 'hello');
  });

  await t.step('replace single character', () => {
    const rs = new ReplaceString('abc');
    rs.replace(1, 2, 'X');
    assertEquals(rs.text, 'aXc');
  });

  await t.step('consecutive replacements', () => {
    const rs = new ReplaceString('aXbYc');
    rs.replace(1, 2, '1');
    rs.replace(3, 4, '2');
    assertEquals(rs.text, 'a1b2c');
  });
});
