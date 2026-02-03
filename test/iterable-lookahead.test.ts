import { assert, assertEquals, assertThrows } from '@std/assert';
import fromArray from '../src/utils/iterable/from-array.ts';
import isIterable from '../src/utils/iterable/is.ts';
import iterableLookahead from '../src/utils/iterable/lookahead.ts';

Deno.test('iterable-lookahead', async (t) => {
  const expected1 = [{
    item: 1,
    ahead: 2,
    behind: undefined,
  }, {
    item: 2,
    ahead: 3,
    behind: 1,
  }, {
    item: 3,
    ahead: 4,
    behind: 2,
  }, {
    item: 4,
    ahead: undefined,
    behind: 3,
  }];

  const expected2 = [{
    item: 1,
    ahead: 3,
    behind: undefined,
  }, {
    item: 2,
    ahead: 4,
    behind: undefined,
  }, {
    item: 3,
    ahead: undefined,
    behind: 1,
  }, {
    item: 4,
    ahead: undefined,
    behind: 2,
  }];

  await t.step('return an iterable', async () => {
    assertEquals(isIterable(iterableLookahead(fromArray([]))), true);
  });

  await t.step('resulting iterable is equivalent to the initial one', async () => {
    const arr = [];

    for await (const item of iterableLookahead(fromArray([1, 2, 3]))) {
      arr.push(item);
    }

    assertEquals(arr, [1, 2, 3]);
  });

  await t.step('resulting iterable has a ahead method', async () => {
    const it = iterableLookahead(fromArray([]));
    assertEquals(typeof it.ahead, 'function');
  });

  await t.step('resulting iterable has a behind method', async () => {
    const it = iterableLookahead(fromArray([]));
    assertEquals(typeof it.behind, 'function');
  });

  await t.step('behind and ahead indexes defaults to 1', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]));
    const result = [];

    for await (const item of it) {
      result.push({
        item,
        ahead: it.ahead(1),
        behind: it.behind(1),
      });
    }

    assertEquals(result, expected1);
  });

  await t.step('behind and ahead works with indexes smaller than size', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]), 2);
    const result = [];

    for await (const item of it) {
      result.push({
        item,
        ahead: it.ahead(1),
        behind: it.behind(1),
      });
    }
    assertEquals(result, Object.assign(expected1.concat(), {}));
  });

  await t.step('behind and ahead use index', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]), 2);
    const result = [];

    for await (const item of it) {
      const r = {
        item,
        ahead: it.ahead(2),
        behind: it.behind(2),
      };
      result.push(r);
    }
    assertEquals(result, expected2);
  });

  await t.step('behind and ahead works with size greater than array', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]), 13);
    const result = [];

    for await (const item of it) {
      const r = {
        item,
        ahead: it.ahead(2),
        behind: it.behind(2),
      };
      result.push(r);
    }
    assertEquals(result, expected2);
  });

  await t.step('throws if lookahead or lookbehind are over size', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]), 1);
    const err1 = assertThrows(() => it.ahead(2)) as Error;
    const err2 = assertThrows(() => it.behind(2)) as Error;

    assertEquals(err1.message, 'cannot look ahead of 2 position, currently depth is 1');
    assertEquals(err2.message, 'cannot look behind of 2 position, currently depth is 1');
    assert(err1 instanceof RangeError);
    assert(err2 instanceof RangeError);
  });

  await t.step('throws if size is smaller than 1', async () => {
    const err1 = assertThrows(() => iterableLookahead(fromArray([1, 2, 3, 4]), -1)) as Error;
    const err2 = assertThrows(() => iterableLookahead(fromArray([1, 2, 3, 4]), 0)) as Error;

    assertEquals(err1.message, 'size argument must be greater than 0');
    assertEquals(err2.message, 'size argument must be greater than 0');
    assert(err1 instanceof RangeError);
    assert(err2 instanceof RangeError);
  });

  await t.step('throws if lookahead or lookbehind are <= 0', async () => {
    const it = iterableLookahead(fromArray([1, 2, 3, 4]), 1);
    const err1 = assertThrows(() => it.ahead(-2)) as Error;
    const err2 = assertThrows(() => it.behind(-2)) as Error;
    const err3 = assertThrows(() => it.ahead(-2)) as Error;
    const err4 = assertThrows(() => it.behind(-2)) as Error;

    assertEquals(err1.message, 'look ahead index must be greater than 0');
    assertEquals(err2.message, 'look behind index must be greater than 0');
    assertEquals(err3.message, 'look ahead index must be greater than 0');
    assertEquals(err4.message, 'look behind index must be greater than 0');
    assert(err1 instanceof RangeError);
    assert(err2 instanceof RangeError);
    assert(err3 instanceof RangeError);
    assert(err4 instanceof RangeError);
  });

  await t.step('throws if data is not iterable', async () => {
    // @ts-expect-error Sending in 42 as an invalid argument
    const err = assertThrows(() => iterableLookahead(42), 1) as Error;
    assertEquals(err.message, 'argument must be an iterable');
    assert(err instanceof TypeError);
  });
});
