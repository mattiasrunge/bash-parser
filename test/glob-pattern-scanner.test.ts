import { assertEquals } from '@std/assert';
import { hasUnquotedGlob, scanGlobPatterns } from '~/utils/glob-pattern-scanner.ts';

Deno.test('hasUnquotedGlob', async (t) => {
  // Basic glob characters
  await t.step('detects * glob', () => {
    assertEquals(hasUnquotedGlob('*.txt'), true);
  });

  await t.step('detects ? glob', () => {
    assertEquals(hasUnquotedGlob('file?.txt'), true);
  });

  await t.step('detects bracket glob', () => {
    assertEquals(hasUnquotedGlob('file[0-9].txt'), true);
  });

  await t.step('no glob returns false', () => {
    assertEquals(hasUnquotedGlob('hello.txt'), false);
  });

  // Single quotes
  await t.step('ignores * in single quotes', () => {
    assertEquals(hasUnquotedGlob("'*.txt'"), false);
  });

  await t.step('ignores ? in single quotes', () => {
    assertEquals(hasUnquotedGlob("'file?.txt'"), false);
  });

  await t.step('ignores brackets in single quotes', () => {
    assertEquals(hasUnquotedGlob("'file[0-9].txt'"), false);
  });

  // Double quotes
  await t.step('ignores * in double quotes', () => {
    assertEquals(hasUnquotedGlob('"*.txt"'), false);
  });

  await t.step('ignores ? in double quotes', () => {
    assertEquals(hasUnquotedGlob('"file?.txt"'), false);
  });

  await t.step('ignores brackets in double quotes', () => {
    assertEquals(hasUnquotedGlob('"file[0-9].txt"'), false);
  });

  // Escaped characters
  await t.step('ignores escaped *', () => {
    assertEquals(hasUnquotedGlob('\\*.txt'), false);
  });

  await t.step('ignores escaped ?', () => {
    assertEquals(hasUnquotedGlob('file\\?.txt'), false);
  });

  await t.step('ignores escaped [', () => {
    assertEquals(hasUnquotedGlob('file\\[0-9].txt'), false);
  });

  // Mixed scenarios
  await t.step('detects glob outside quotes', () => {
    assertEquals(hasUnquotedGlob("'safe'*.txt"), true);
  });

  await t.step('detects glob after double quotes', () => {
    assertEquals(hasUnquotedGlob('"prefix"*.txt'), true);
  });

  await t.step('detects glob before quotes', () => {
    assertEquals(hasUnquotedGlob('*.txt"suffix"'), true);
  });

  // Incomplete bracket
  await t.step('incomplete bracket is not glob', () => {
    assertEquals(hasUnquotedGlob('file[0-9.txt'), false);
  });

  await t.step('standalone [ is not glob', () => {
    assertEquals(hasUnquotedGlob('file[incomplete'), false);
  });

  // Edge cases
  await t.step('empty string returns false', () => {
    assertEquals(hasUnquotedGlob(''), false);
  });

  await t.step('backslash in single quotes does not escape', () => {
    // In single quotes, backslash is literal, so \* is not an escape
    assertEquals(hasUnquotedGlob("'\\*'"), false);
  });

  await t.step('backslash before single quote is escape', () => {
    // \' outside quotes escapes the quote, so * is unquoted
    assertEquals(hasUnquotedGlob("\\'*"), true);
  });

  await t.step('double backslash followed by glob', () => {
    // \\ is escaped backslash, so * is unquoted
    assertEquals(hasUnquotedGlob('\\\\*'), true);
  });

  await t.step('bracket with ] first is not glob', () => {
    // []] means ] is the first char in class, then ends with ]
    assertEquals(hasUnquotedGlob('[]abc]'), true);
  });
});

Deno.test('scanGlobPatterns', async (t) => {
  // Basic patterns
  await t.step('finds * pattern', () => {
    const result = scanGlobPatterns('*.txt');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '*.txt');
    assertEquals(result[0].start, 0);
    assertEquals(result[0].end, 5);
  });

  await t.step('finds ? pattern', () => {
    const result = scanGlobPatterns('file?.txt');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, 'file?.txt');
  });

  await t.step('finds bracket pattern', () => {
    const result = scanGlobPatterns('file[0-9].txt');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, 'file[0-9].txt');
  });

  await t.step('returns empty for no globs', () => {
    const result = scanGlobPatterns('hello.txt');
    assertEquals(result.length, 0);
  });

  // Quoted sections
  await t.step('ignores single-quoted globs', () => {
    const result = scanGlobPatterns("'*.txt'");
    assertEquals(result.length, 0);
  });

  await t.step('ignores double-quoted globs', () => {
    const result = scanGlobPatterns('"*.txt"');
    assertEquals(result.length, 0);
  });

  await t.step('finds unquoted glob after single quotes', () => {
    const result = scanGlobPatterns("'prefix'*.txt");
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '*.txt');
    assertEquals(result[0].start, 8);
    assertEquals(result[0].end, 13);
  });

  await t.step('finds unquoted glob before single quotes', () => {
    const result = scanGlobPatterns("*'suffix'");
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '*');
    assertEquals(result[0].start, 0);
    assertEquals(result[0].end, 1);
  });

  await t.step('finds unquoted glob after double quotes', () => {
    const result = scanGlobPatterns('"prefix"*.txt');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '*.txt');
  });

  // Escaped characters
  await t.step('ignores escaped *', () => {
    const result = scanGlobPatterns('\\*.txt');
    assertEquals(result.length, 0);
  });

  await t.step('ignores escaped ?', () => {
    const result = scanGlobPatterns('file\\?.txt');
    assertEquals(result.length, 0);
  });

  await t.step('ignores escaped [', () => {
    const result = scanGlobPatterns('file\\[0-9].txt');
    assertEquals(result.length, 0);
  });

  // Incomplete brackets
  await t.step('ignores incomplete bracket', () => {
    const result = scanGlobPatterns('file[0-9');
    assertEquals(result.length, 0);
  });

  await t.step('handles bracket with * inside', () => {
    // [*] is a bracket expression matching literal *
    const result = scanGlobPatterns('[*]');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '[*]');
  });

  await t.step('handles multiple patterns', () => {
    const result = scanGlobPatterns('*.txt and *.log');
    assertEquals(result.length, 1);
    // Both are in the same unquoted segment
    assertEquals(result[0].pattern, '*.txt and *.log');
  });

  // Edge cases
  await t.step('empty string returns empty', () => {
    const result = scanGlobPatterns('');
    assertEquals(result.length, 0);
  });

  await t.step('double backslash followed by glob', () => {
    // \\ is escaped backslash, * is unquoted
    const result = scanGlobPatterns('\\\\*');
    assertEquals(result.length, 1);
  });

  await t.step('complex mixed example', () => {
    const result = scanGlobPatterns('prefix"quoted"*.txt\'more\'end');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '*.txt');
  });

  await t.step('multiple quoted segments between globs', () => {
    const result = scanGlobPatterns('*"middle"?');
    assertEquals(result.length, 2);
    assertEquals(result[0].pattern, '*');
    assertEquals(result[1].pattern, '?');
  });

  await t.step('bracket with ? inside is complete', () => {
    const result = scanGlobPatterns('[?]');
    assertEquals(result.length, 1);
  });

  await t.step('nested bracket chars', () => {
    const result = scanGlobPatterns('[[abc]');
    assertEquals(result.length, 1);
    assertEquals(result[0].pattern, '[[abc]');
  });
});
