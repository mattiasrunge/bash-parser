import { assertSnapshot } from '@std/testing/snapshot';
import bashParser from '../src/parse.ts';

Deno.test('loc-until', async (t) => {
  await t.step('loc in until statement', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('until true || 1; do sleep 1;echo ciao; done', { insertLOC: true }),
    );
  });
});
