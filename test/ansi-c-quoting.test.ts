import { assertEquals } from '@std/assert';
import { parse } from '../mod.ts';
import unquoteWord from '../src/utils/unquote-word.ts';
import unescape from '../src/utils/unescape.ts';

/** Quote removal as the parser runs it: unquoteWord followed by unescape */
const unquote = (text: string) => unquoteWord(text).values.map(unescape);

const words = async (source: string) => {
  const ast = await parse(source);
  const command = ast.commands[0] as { suffix?: { text: string }[] };

  return command.suffix?.map((word) => word.text);
};

Deno.test("ANSI-C quoting $'…'", async (t) => {
  await t.step('decodes the usual escapes', () => {
    assertEquals(unquote("$'a\\nb'"), ['a\nb']);
    assertEquals(unquote("$'a\\tb'"), ['a\tb']);
    assertEquals(unquote("$'a\\\\b'"), ['a\\b']);
  });

  await t.step('decodes hex, unicode and octal', () => {
    assertEquals(unquote("$'\\x41'"), ['A']);
    assertEquals(unquote("$'\\u00e5'"), ['å']);
    assertEquals(unquote("$'\\101'"), ['A']);
  });

  await t.step('keeps an unknown escape as a backslash', () => {
    assertEquals(unquote("$'a\\qb'"), ['a\\qb']);
  });

  await t.step('an escaped quote does not end the string', () => {
    assertEquals(unquote("$'it\\'s'"), ["it's"]);
  });

  await t.step('the decoded text is quoted, so blanks do not split the word', async () => {
    assertEquals(unquote("$'a b'"), ['a b']);
    assertEquals(await words("echo $'a b'"), ['a b']);
  });

  await t.step('it joins with the rest of the word', () => {
    assertEquals(unquote("pre$'\\n'post"), ['pre\npost']);
  });

  await t.step('inside double quotes it is literal, as in bash', () => {
    assertEquals(unquote(`"$'ab'"`), ["$'ab'"]);
  });

  await t.step('a newline inside it survives into one word', async () => {
    assertEquals(await words("echo $'a\\nb' c"), ['a\nb', 'c']);
  });
});
