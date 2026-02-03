import bashParser from '../src/parse.ts';
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.txt',
          resolved: false,
          loc: { start: 0, end: 5 },
        },
      ],
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.conf',
          resolved: false,
          loc: { start: 2, end: 8 },
        },
      ],
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: 'file?.log',
          resolved: false,
          loc: { start: 0, end: 9 },
        },
      ],
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: 'file[0-9].txt',
          resolved: false,
          loc: { start: 0, end: 13 },
        },
      ],
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
    const expectedExpansion = [
      {
        type: 'PathExpansion',
        pattern: '*.txt',
        resolved: false,
        loc: { start: 0, end: 5 },
      },
    ];
    utils.checkResults(suffix[0], { type: 'Word', text: 'file1.txt', expansion: expectedExpansion });
    utils.checkResults(suffix[1], { type: 'Word', text: 'file2.txt', expansion: expectedExpansion });
    utils.checkResults(suffix[2], { type: 'Word', text: 'file3.txt', expansion: expectedExpansion });
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.txt',
          resolved: false,
          loc: { start: 0, end: 5 },
        },
      ],
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
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.conf',
          resolved: false,
          loc: { start: 2, end: 8 },
        },
      ],
    });
  });

  await t.step('tracks glob pattern as PathExpansion without resolver', async () => {
    const result = await bashParser('echo *.txt');
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '*.txt',
      expansion: [
        {
          type: 'PathExpansion',
          pattern: '*.txt',
          resolved: false,
          loc: { start: 0, end: 5 },
        },
      ],
    });
  });

  await t.step('preserves assignment value with multiple equals signs and glob', async () => {
    // Regression test: assignment values containing '=' should not be truncated
    // when the value also contains a glob pattern
    const result = await bashParser('VAR=prefix=*.txt', {
      async resolvePath() {
        return ['prefix=matched.txt'];
      },
    });
    utils.checkResults((result as any).commands[0].prefix[0], {
      type: 'AssignmentWord',
      text: 'VAR=prefix=matched.txt',
    });
  });
});
