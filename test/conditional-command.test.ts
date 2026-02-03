import { assertSnapshot } from '@std/testing/snapshot';
import bashParser from '../src/parse.ts';

Deno.test('conditional-command', async (t) => {
  // Basic unary tests
  await t.step('[[ -f /etc/passwd ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -f /etc/passwd ]]'));
  });

  await t.step('[[ -d /tmp ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -d /tmp ]]'));
  });

  await t.step('[[ -z "$var" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -z "$var" ]]'));
  });

  await t.step('[[ -n "$var" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -n "$var" ]]'));
  });

  // Binary string comparisons
  await t.step('[[ "$a" == "$b" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ "$a" == "$b" ]]'));
  });

  await t.step('[[ "$a" != "$b" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ "$a" != "$b" ]]'));
  });

  await t.step('[[ "$a" < "$b" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ "$a" < "$b" ]]'));
  });

  await t.step('[[ "$a" > "$b" ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ "$a" > "$b" ]]'));
  });

  // Binary numeric comparisons
  await t.step('[[ $x -eq 10 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ $x -eq 10 ]]'));
  });

  await t.step('[[ $x -ne 10 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ $x -ne 10 ]]'));
  });

  await t.step('[[ $x -lt 10 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ $x -lt 10 ]]'));
  });

  await t.step('[[ $x -gt 10 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ $x -gt 10 ]]'));
  });

  // Regex matching
  await t.step('[[ "$str" =~ ^[0-9]+$ ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ "$str" =~ ^[0-9]+$ ]]'));
  });

  // Logical operators
  await t.step('[[ -f file && -r file ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -f file && -r file ]]'));
  });

  await t.step('[[ -f file || -d file ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ -f file || -d file ]]'));
  });

  // Negation
  await t.step('[[ ! -f file ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ ! -f file ]]'));
  });

  // Grouping with parentheses
  await t.step('[[ ( -f file || -d file ) && -r file ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ ( -f file || -d file ) && -r file ]]'));
  });

  // Integration with if statement
  await t.step('if [[ -f file ]]; then echo yes; fi', async (t) => {
    await assertSnapshot(t, await bashParser('if [[ -f file ]]; then echo yes; fi'));
  });

  // Integration with while loop
  await t.step('while [[ $i -lt 10 ]]; do echo $i; done', async (t) => {
    await assertSnapshot(t, await bashParser('while [[ $i -lt 10 ]]; do echo $i; done'));
  });

  // File comparison operators
  await t.step('[[ file1 -nt file2 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ file1 -nt file2 ]]'));
  });

  await t.step('[[ file1 -ot file2 ]]', async (t) => {
    await assertSnapshot(t, await bashParser('[[ file1 -ot file2 ]]'));
  });
});
