import bashParser from '~/parse.ts';
import utils from './_utils.ts';

Deno.test('pathname-expansion', async (t) => {
  await t.step('expands glob in command word', async () => {
    const result = await bashParser('echo *.txt', {
      async resolvePath() {
        return ['expanded'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'expanded',
    });
  });

  await t.step('expands glob in assignment', async () => {
    const result = await bashParser('a=*.conf', {
      async resolvePath() {
        return ['app.conf'];
      },
    });
    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'a=app.conf',
    });
  });

  await t.step('does not expand without glob chars', async () => {
    const result = await bashParser('echo hello', {
      async resolvePath() {
        return ['should-not-be-called'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'hello',
    });
  });

  await t.step('does not expand quoted globs', async () => {
    const result = await bashParser('echo "*.txt"', {
      async resolvePath() {
        return ['should-not-be-called'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
    });
  });

  await t.step('does not expand single-quoted globs', async () => {
    const result = await bashParser("echo '*.txt'", {
      async resolvePath() {
        return ['should-not-be-called'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
    });
  });

  await t.step('expands ? glob character', async () => {
    const result = await bashParser('ls file?.log', {
      async resolvePath() {
        return ['expanded'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'expanded',
    });
  });

  await t.step('expands [ glob character', async () => {
    const result = await bashParser('ls file[0-9].txt', {
      async resolvePath() {
        return ['expanded'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: 'expanded',
    });
  });

  await t.step('does not expand escaped glob', async () => {
    const result = await bashParser('echo \\*.txt', {
      async resolvePath() {
        return ['should-not-be-called'];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
    });
  });

  await t.step('expands glob to multiple words when array returned', async () => {
    const result = await bashParser('echo *.txt', {
      async resolvePath() {
        return ['file1.txt', 'file2.txt', 'file3.txt'];
      },
    });
    const suffix = (result as any).commands[0].suffix;
    utils.checkResults(suffix[0], { type: 'Word', text: 'file1.txt' });
    utils.checkResults(suffix[1], { type: 'Word', text: 'file2.txt' });
    utils.checkResults(suffix[2], { type: 'Word', text: 'file3.txt' });
  });

  await t.step('keeps original pattern when array is empty', async () => {
    const result = await bashParser('echo *.txt', {
      async resolvePath() {
        return [];
      },
    });
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
    });
  });

  await t.step('assignment uses first match from array', async () => {
    const result = await bashParser('a=*.conf', {
      async resolvePath() {
        return ['first.conf', 'second.conf'];
      },
    });
    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'a=first.conf',
    });
  });
});
