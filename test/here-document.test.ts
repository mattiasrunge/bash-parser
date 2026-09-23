import { assertEquals, assertRejects } from '@std/assert';
import bashParser from '../src/parse.ts';
import type { AstNodeCommand, AstNodeRedirect } from '../src/ast/types.ts';

/** Every here-document redirect in the script, in order. */
const hereDocuments = (node: unknown): AstNodeRedirect[] => {
  if (!node || typeof node !== 'object') return [];
  const found: AstNodeRedirect[] = [];
  const record = node as Record<string, unknown>;
  if (record.type === 'Redirect' && record.heredoc) found.push(record as AstNodeRedirect);
  for (const value of Object.values(record)) found.push(...hereDocuments(value));
  return found;
};

const commandNames = (script: { commands: unknown[] }) => script.commands.map((command) => (command as AstNodeCommand).name?.text);

Deno.test('here-documents', async (t) => {
  await t.step('the body is text, not commands: parentheses and markdown in it parse', async () => {
    const script = "set -e\n\n# a comment\ncat > /tmp/notes.md << 'EOF'\n# Heading\n- **Anna Exempel** (mother)\n  Born: 1950-01-01\n\n*done*\nEOF\necho after\n";
    const result = await bashParser(script);
    assertEquals(commandNames(result), ['set', 'cat', 'echo']);
    const [doc] = hereDocuments(result);
    assertEquals(doc.op.text, '<<');
    assertEquals(doc.file.text, 'EOF');
    assertEquals(doc.heredoc, { body: '# Heading\n- **Anna Exempel** (mother)\n  Born: 1950-01-01\n\n*done*\n', quoted: true });
  });

  await t.step('an unquoted delimiter leaves the body for expansion; any quoting makes it literal', async () => {
    for (const [delimiter, quoted] of [['EOF', false], ["'EOF'", true], ['"EOF"', true], ['\\EOF', true], ['E"O"F', true]] as const) {
      const [doc] = hereDocuments(await bashParser(`cat <<${delimiter}\nhi $USER\nEOF\n`));
      assertEquals(doc.heredoc, { body: 'hi $USER\n', quoted }, delimiter);
    }
  });

  await t.step('<<- drops leading tabs from the body and the closing line', async () => {
    const [doc] = hereDocuments(await bashParser('cat <<-EOF\n\t\tindented\n\t  spaces stay\n\tEOF\n'));
    assertEquals(doc.op.text, '<<-');
    assertEquals(doc.heredoc!.body, 'indented\n  spaces stay\n');
  });

  await t.step('the rest of the line after the delimiter is still shell', async () => {
    const result = await bashParser('cat <<EOF | grep x\nax\nb\nEOF\necho done');
    assertEquals(result.commands.length, 2);
    assertEquals(hereDocuments(result)[0].heredoc!.body, 'ax\nb\n');
  });

  await t.step('two on one line are read one after the other', async () => {
    const docs = hereDocuments(await bashParser('cat <<A; cat <<B\none\nA\ntwo\nB\n'));
    assertEquals(docs.map((doc) => [doc.file.text, doc.heredoc!.body]), [['A', 'one\n'], ['B', 'two\n']]);
  });

  await t.step('a line that only starts with the delimiter does not close it', async () => {
    const [doc] = hereDocuments(await bashParser('cat <<EOF\nEOF not yet\n EOF\nEOF\n'));
    assertEquals(doc.heredoc!.body, 'EOF not yet\n EOF\n');
  });

  await t.step('an fd number applies to it', async () => {
    const [doc] = hereDocuments(await bashParser('cat 3<<EOF\nx\nEOF\n'));
    assertEquals(doc.numberIo?.text, '3');
    assertEquals(doc.heredoc!.body, 'x\n');
  });

  await t.step('a body not yet closed is unclosed, like a quote, so a shell can ask for the rest', async () => {
    await assertRejects(() => bashParser('cat <<EOF\nhello\n'), Error, 'Unclosed here-document');
    await assertRejects(() => bashParser('cat <<EOF'), Error, 'Unclosed here-document');
  });

  await t.step('lines after it keep their locations', async () => {
    const result = await bashParser("cat <<'EOF'\n(one)\ntwo\nEOF\necho after\n", { insertLOC: true });
    assertEquals((result.commands[1] as AstNodeCommand).name!.loc!.start, { col: 1, row: 5, char: 26 });
  });

  await t.step('a shift in arithmetic is not a here-document', async () => {
    assertEquals(hereDocuments(await bashParser('echo $((1 << 2))\n')), []);
  });
});
