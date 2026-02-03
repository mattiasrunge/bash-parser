import { assertRejects } from '@std/assert';
import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

function testUnclosed(cmd: string, char: string) {
  return async () => {
    assertRejects(
      () => bashParser(cmd),
      SyntaxError,
      'Unclosed ' + char,
    );
  };
}

Deno.test('quoting', async (t) => {
  await t.step('throws on unclosed double quotes', testUnclosed('echo "TEST1', '"'));
  await t.step('throws on unclosed single quotes', testUnclosed("echo 'TEST1", "'"));
  await t.step('throws on unclosed command subst', testUnclosed('echo $(TEST1', '$('));
  await t.step('throws on unclosed backtick command subst', testUnclosed('echo `TEST1', '`'));
  await t.step('throws on unclosed arhit subst', testUnclosed('echo $((TEST1', '$(('));
  await t.step('throws on unclosed param subst', testUnclosed('echo ${TEST1', '${'));

  await t.step('quotes within double quotes', async () => {
    const result = await bashParser('echo "TEST1 \'TEST2"');
    // utils.logResults(result)
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: "TEST1 'TEST2" }],
      }],
    });
  });

  await t.step('escaped double quotes within double quotes', async () => {
    const result = await bashParser('echo "TEST1 \\"TEST2"');

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'TEST1 "TEST2' }],
      }],
    });
  });

  await t.step('double quotes within single quotes', async () => {
    const result = await bashParser("echo 'TEST1 \"TEST2'");
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'TEST1 "TEST2' }],
      }],
    });
  });

  await t.step('Partially quoted word', async () => {
    const result = await bashParser("echo TEST1' TEST2 'TEST3");
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'TEST1 TEST2 TEST3' }],
      }],
    });
  });

  await t.step('Partially double quoted word', async () => {
    const result = await bashParser('echo TEST3" TEST4 "TEST5');

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [{ type: 'Word', text: 'TEST3 TEST4 TEST5' }],
      }],
    });
  });
});
