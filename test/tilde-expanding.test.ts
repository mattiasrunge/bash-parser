import bashParser from '~/parse.ts';
import utils from './_utils.ts';

Deno.test('tilde-expanding', async (t) => {
  await t.step('resolve tilde to current user home', async () => {
    const result = await bashParser('echo ~/subdir', {
      async resolveHomeUser() {
        return '/home/current';
      },
    });

    utils.checkResults(result, {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: { type: 'Word', text: 'echo' },
          suffix: [{
            type: 'Word',
            text: '/home/current/subdir',
          }],
        },
      ],
    });
  });

  await t.step('resolve one tilde only in normal WORD tokens', async () => {
    const result = await bashParser('echo ~/subdir/~other/', {
      async resolveHomeUser() {
        return '/home/current';
      },
    });

    utils.checkResults(result, {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: { type: 'Word', text: 'echo' },
          suffix: [{
            type: 'Word',
            text: '/home/current/subdir/~other/',
          }],
        },
      ],
    });
  });

  await t.step('resolve multiple tilde in assignments', async () => {
    const result = await bashParser('a=~/subdir:~/othersubdir/ciao', {
      async resolveHomeUser() {
        return '/home/current';
      },
    });
    // utils.logResults(result.commands[0].prefix[0]);
    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'a=/home/current/subdir:/home/current/othersubdir/ciao',
    });
  });

  await t.step('resolve tilde to any user home', async () => {
    const result = await bashParser('echo ~username/subdir', {
      async resolveHomeUser() {
        return '/home/username';
      },
    });

    utils.checkResults(result, {
      type: 'Script',
      commands: [
        {
          type: 'Command',
          name: { type: 'Word', text: 'echo' },
          suffix: [{
            type: 'Word',
            text: '/home/username/subdir',
          }],
        },
      ],
    });
  });

  await t.step('preserves assignment value with multiple equals signs', async () => {
    // Regression test: assignment values containing '=' should not be truncated
    // e.g., VAR=$(CMD=1 other) should preserve the full command substitution
    const result = await bashParser('STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")', {
      async resolveHomeUser() {
        return '/home/user';
      },
    });

    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'STAT_OUTPUT=$(JSON_OUTPUT=1 file-stat "$FILENAME")',
    });
  });

  await t.step('preserves assignment value with multiple equals in command substitution', async () => {
    // Another regression test with even more equals signs
    const result = await bashParser('VAR=$(A=1 B=2 C=3 cmd)', {
      async resolveHomeUser() {
        return '/home/user';
      },
    });

    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'VAR=$(A=1 B=2 C=3 cmd)',
    });
  });
});
