import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';
import { substitutionEnd } from '../src/utils/substitution-end.ts';

Deno.test('where a command substitution ends', async (t) => {
  await t.step('a case pattern ) is not the end', () => {
    const body = 'case x in a) echo 1;; (b|c) echo 2;; esac) rest';
    assertEquals(substitutionEnd(body), body.indexOf(') rest'));
  });

  await t.step('nor a ) in a comment, a quoted string or a here-document', () => {
    assertEquals(substitutionEnd('echo a # (not) this )\n)'), 22);
    const quoted = 'echo ")" \')\' \\) )';
    assertEquals(substitutionEnd(quoted), quoted.length - 1);
    const heredoc = 'cat <<EOF\nhere doc with )\nEOF\n)';
    assertEquals(substitutionEnd(heredoc), heredoc.length - 1);
  });

  await t.step('nested substitutions and expansions', () => {
    const nested = 'echo $(echo $((1+2))) ${x%)})';
    assertEquals(substitutionEnd(nested), nested.length - 1);
  });

  await t.step('an unfinished body', () => {
    assertEquals(substitutionEnd('echo (a'), -1);
    assertEquals(substitutionEnd('echo "a)'), -1);
  });

  await t.step('the parser takes the whole command', async () => {
    const result = await bashParser('x=$(case $y in a) echo A;; *) echo B;; esac)');
    const command = (result.commands[0] as any).prefix[0].expansion[0];
    assertEquals(command.command, 'case $y in a) echo A;; *) echo B;; esac');
    assertEquals(command.commandAST.commands[0].type, 'Case');
  });
});
