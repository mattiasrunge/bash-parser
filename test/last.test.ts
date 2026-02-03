import { assertEquals, assertThrows } from '@std/assert';
import last from '../src/utils/last.ts';

Deno.test('last utility', async (t) => {
  await t.step('returns last element of array', () => {
    assertEquals(last([1, 2, 3]), 3);
  });

  await t.step('returns last element of single-element array', () => {
    assertEquals(last([42]), 42);
  });

  await t.step('returns null for empty array', () => {
    assertEquals(last([]), null);
  });

  await t.step('works with string array', () => {
    assertEquals(last(['a', 'b', 'c']), 'c');
  });

  await t.step('works with object array', () => {
    const obj = { x: 1 };
    assertEquals(last([{ a: 1 }, obj]), obj);
  });

  await t.step('throws for non-array input', () => {
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => last('not an array' as any),
      Error,
      'argument must be be an array',
    );
  });

  await t.step('throws for null input', () => {
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => last(null as any),
      Error,
    );
  });

  await t.step('throws for undefined input', () => {
    assertThrows(
      // deno-lint-ignore no-explicit-any
      () => last(undefined as any),
      Error,
    );
  });
});
