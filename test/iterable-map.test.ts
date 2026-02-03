import { assert, assertEquals, assertRejects, assertThrows } from '@std/assert';
import fromArray from '../src/utils/iterable/from-array.ts';
import isIterable from '../src/utils/iterable/is.ts';
import map from '../src/utils/iterable/map.ts';
import toArray from '../src/utils/iterable/to-array.ts';

const fixture = [1, 2, 3];
const expected = [2, 4, 6];
const expectedIdx = [0, 1, 2];
const double = async (n: number) => n * 2;
const indexCb = async (_: number, idx: number) => idx;

Deno.test('iterable-map', async (t) => {
  await t.step('return an iterable', async () => {
    const mapper = map<number | null>(async () => null);
    assertEquals(isIterable(mapper(fromArray(fixture))), true);
  });

  await t.step('apply the callback to every item', async () => {
    const mapper = map(double);
    const results = mapper(fromArray(fixture));
    assertEquals(await toArray(results), expected);
  });

  await t.step('pass item index to the callback', async () => {
    const mapper = map(indexCb);
    const results = mapper(fromArray(fixture));
    assertEquals(await toArray(results), expectedIdx);
  });

  await t.step('can be curried', async () => {
    const mapDouble = map(double);
    assertEquals(await toArray(mapDouble(fromArray(fixture))), expected);
  });

  await t.step('throws if data is not iterable', async () => {
    const mapDouble = map(double);
    // @ts-expect-error Sending in 42 as an invalid argument
    const err = (await assertRejects(async () => await toArray(mapDouble(42)))) as Error;
    assertEquals(err.message, 'argument must be an iterable');
    assert(err instanceof TypeError);
  });

  await t.step('throws if callback is not a function nor an object', async () => {
    // @ts-expect-error Sending in 42 as an invalid argument
    const err = assertThrows(() => map(42)) as Error;
    assertEquals(err.message, 'transform argument must be a function');
    assert(err instanceof TypeError);
  });

  await t.step('work with generators', async () => {
    const mapDouble = map(double);
    const generator = async function* () {
      yield 1;
      yield 2;
      yield 3;
    };
    assertEquals(await toArray(mapDouble(generator())), expected);
  });
});
