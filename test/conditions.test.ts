import { assertSnapshot } from '@std/testing/snapshot';
import bashParser from '../src/parse.ts';

Deno.test('conditions', async (t) => {
  await t.step('if [ "$a" -eq 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -eq 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ "$a" -ne 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -ne 10 ]; then echo 1; fi'),
    );
  });

  await t.step('[ "$a" -gt 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -gt 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ "$a" -ge 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -ge 10 ]; then echo 1; fi'),
    );
  });

  await t.step('[ "$a" -lt 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -lt 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ "$a" -le 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" -le 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ "$a" == 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" == 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ "$a" != 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$a" != 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ ! "$a" = 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ ! "$a" = 10 ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -z "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -z "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -n "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -n "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -d "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -d "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -f "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -f "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -r "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -r "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -w "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -w "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('if [ -x "$a" ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ -x "$a" ]; then echo 1; fi'),
    );
  });

  await t.step('while [ "$a" -le 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('while [ "$a" -le 10 ]; do echo 1; done'),
    );
  });

  await t.step('until [ "$a" -ge 10 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('until [ "$a" -ge 10 ]; do echo 1; done'),
    );
  });

  await t.step('if [ "$(command)" -eq 1 ]', async (t) => {
    await assertSnapshot(
      t,
      await bashParser('if [ "$(command)" -eq 1 ]; then echo 1; fi'),
    );
  });
});
