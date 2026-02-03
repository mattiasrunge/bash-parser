import { assertSnapshot } from '@std/testing/snapshot';
import bashParser from '../src/parse.ts';

Deno.test('loc-while', async (t) => {
  await t.step('loc in while statement', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('while true && 1; do sleep 1;echo ciao; done', { insertLOC: true }),
    );
  });
});
