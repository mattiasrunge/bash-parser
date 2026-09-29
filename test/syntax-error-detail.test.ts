import { assertEquals, assertRejects } from '@std/assert';
import { BashSyntaxError, parse } from '../mod.ts';
import type { AstNodeCommand, AstNodeRedirect } from '../mod.ts';

/** What a syntax error says went wrong, and on which line. */
const failure = async (source: string) => {
  const err = await assertRejects(() => parse(source), BashSyntaxError);

  return { detail: err.detail, row: err.location?.start?.row };
};

Deno.test('a syntax error says what went wrong, as bash names it', async (t) => {
  await t.step('a token that cannot stand there', async () => {
    assertEquals(await failure('for z; done'), { detail: { kind: 'token', token: 'done' }, row: 1 });
    assertEquals(await failure('x() { ; }'), { detail: { kind: 'token', token: ';' }, row: 1 });
    assertEquals(await failure('echo 1\nif x\nthen\n  fi fi'), { detail: { kind: 'token', token: 'fi' }, row: 4 });
  });

  await t.step('the input ending in the middle of a command', async () => {
    assertEquals((await failure('if x; then')).detail, { kind: 'eof' });
    assertEquals((await failure('a |')).detail, { kind: 'eof' });
  });

  await t.step('a quote or substitution left open, with what would close it', async () => {
    assertEquals((await failure('echo "abc')).detail, { kind: 'unclosed', closer: '"' });
    assertEquals((await failure('echo $(')).detail, { kind: 'unclosed', closer: ')' });
    assertEquals((await failure('echo ${')).detail, { kind: 'unclosed', closer: '}' });
  });

  await t.step('inside $( ), on the line of the source, the ) ending a body too soon', async () => {
    assertEquals(await failure(': $( for z in 1 2 3; do )'), { detail: { kind: 'token', token: ')' }, row: 1 });
    assertEquals(await failure('x\necho "$(\nfi\n)"'), { detail: { kind: 'token', token: 'fi' }, row: 3 });
  });
});

Deno.test('a here-document the input ends inside', async (t) => {
  await t.step('is unclosed by default, for an interactive shell to ask for more', async () => {
    assertEquals((await failure('cat <<EOF\nbody')).detail, { kind: 'unclosed', closer: 'here-document' });
  });

  await t.step("with unterminatedHereDocuments: 'end' takes the rest of the input, and says where", async () => {
    const ast = await parse('x\ncat <<EOF\nbody\n', { unterminatedHereDocuments: 'end' });
    const redirect = (ast.commands[1] as AstNodeCommand).suffix![0] as AstNodeRedirect;

    assertEquals(redirect.heredoc, { body: 'body\n', quoted: false, unterminated: { delimiter: 'EOF', line: 2, endLine: 3 } });
  });
});
