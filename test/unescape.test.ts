import unescape from '../src/utils/unescape.ts';
import utils from './_utils.ts';

Deno.test('unescape', async (t) => {
  await t.step('usual escape sequences', () => {
    utils.checkResults(unescape('---\\0---'), '---\0---');
    utils.checkResults(unescape('---\\b---'), '---\b---');
    utils.checkResults(unescape('---\\f---'), '---\f---');
    utils.checkResults(unescape('---\\n---'), '---\n---');
    utils.checkResults(unescape('---\\r---'), '---\r---');
    utils.checkResults(unescape('---\\t---'), '---\t---');
    utils.checkResults(unescape('---\\v---'), '---\v---');
    utils.checkResults(unescape("---\\'---"), "---'---");
    utils.checkResults(unescape('---\\"---'), '---"---');
    utils.checkResults(unescape('---\\\\---'), '---\\---');
  });

  await t.step('octal escape sequences', () => {
    // '---S---' instead of '---\123---' because octal literals are prohibited in strict mode
    utils.checkResults(unescape('---\\123---'), '---S---');
    utils.checkResults(unescape('---\\040---'), '--- ---');
    utils.checkResults(unescape('---\\54---'), '---,---');
    utils.checkResults(unescape('---\\4---'), '---\u{4}---');
  });

  await t.step('short hex escape sequences', () => {
    utils.checkResults(unescape('---\\xAC---'), '---\xAC---');
  });

  await t.step('long hex escape sequences', () => {
    utils.checkResults(unescape('---\\u00A9---'), '---\u00A9---');
  });

  await t.step('variable hex escape sequences', () => {
    utils.checkResults(unescape('---\\u{A9}---'), '---\u{A9}---');
    utils.checkResults(unescape('---\\u{2F804}---'), '---\u{2F804}---');
  });

  await t.step('avoids double unescape cascade', () => {
    utils.checkResults(unescape('---\\\\x41---'), '---\\x41---');
    utils.checkResults(unescape('---\\x5cx41---'), '---\\x41---');
  });

  await t.step('python hex escape sequences', () => {
    utils.checkResults(unescape('---\\U000000A9---'), '---\u00A9---');
    utils.checkResults(unescape('---\\U0001F3B5---'), '---\uD83C\uDFB5---');
  });
});
