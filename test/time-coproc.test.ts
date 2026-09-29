import { assertEquals } from '@std/assert';
import { parse } from '../mod.ts';

/** The first command of a script, without the location fields. */
const first = async (source: string) => {
  const ast = await parse(source);

  return JSON.parse(JSON.stringify(ast.commands[0])) as Record<string, unknown>;
};

const word = (text: string) => ({ type: 'Word', text });

Deno.test('time', async (t) => {
  await t.step('times the pipeline after it', async () => {
    const node = await first('time a | b');

    assertEquals(node.type, 'Pipeline');
    assertEquals(node.time, { posix: false });
  });

  await t.step('-p asks for the POSIX format, and -- after it ends the options', async () => {
    assertEquals(await first('time -p echo a'), { type: 'Command', name: word('echo'), suffix: [word('a')], time: { posix: true } });
    assertEquals(await first('time -p -- echo a'), { type: 'Command', name: word('echo'), suffix: [word('a')], time: { posix: true } });
  });

  await t.step('any other word after time is the command', async () => {
    assertEquals(await first('time -x'), { type: 'Command', name: word('-x'), time: { posix: false } });
    assertEquals(await first('time -- a'), { type: 'Command', name: word('--'), suffix: [word('a')], time: { posix: false } });
  });

  await t.step('on its own it times an empty command', async () => {
    assertEquals(await first('time'), { type: 'Command', time: { posix: false } });
    assertEquals(await first('time; b'), { type: 'Command', time: { posix: false } });
  });

  await t.step('nests with ! either way round, and twice reports once', async () => {
    assertEquals(await first('time ! true'), { type: 'Command', name: word('true'), bang: true, time: { posix: false } });
    assertEquals(await first('! time true'), { type: 'Command', name: word('true'), bang: true, time: { posix: false } });
    assertEquals(await first('! time ! true'), { type: 'Command', name: word('true'), time: { posix: false } });
    assertEquals(await first('time time -p true'), { type: 'Command', name: word('true'), time: { posix: true } });
  });

  await t.step('is a word anywhere but where a command starts', async () => {
    assertEquals(await first('echo time -p'), { type: 'Command', name: word('echo'), suffix: [word('time'), word('-p')] });

    const node = await first('x=1 time echo');

    assertEquals(node.name, word('time'));
  });

  await t.step('starts a command after && and in a group', async () => {
    const node = await first('a && time b') as { right: Record<string, unknown> };

    assertEquals(node.right.time, { posix: false });
  });
});

Deno.test('! alone and repeated', async () => {
  assertEquals(await first('!'), { type: 'Command', bang: true });
  assertEquals(await first('! !'), { type: 'Command' });
  assertEquals(await first('! ! ! true'), { type: 'Command', name: word('true'), bang: true });
});

Deno.test('coproc', async (t) => {
  await t.step('a simple command is named COPROC', async () => {
    assertEquals(await first('coproc cat -n'), {
      type: 'Coproc',
      name: 'COPROC',
      body: { type: 'Command', name: word('cat'), suffix: [word('-n')] },
    });
  });

  await t.step('a word before a compound command names it', async () => {
    const node = await first('coproc REFLECT { cat - ; }') as { name: string; body: { type: string } };

    assertEquals(node.name, 'REFLECT');
    assertEquals(node.body.type, 'CompoundList');
  });

  await t.step('the compound command may be any, unnamed too', async () => {
    const subshell = await first('coproc (echo x)') as { name: string; body: { type: string } };
    const loop = await first('coproc X while :; do :; done') as { name: string; body: { type: string } };

    assertEquals([subshell.name, subshell.body.type], ['COPROC', 'Subshell']);
    assertEquals([loop.name, loop.body.type], ['X', 'While']);
  });

  await t.step('redirections after the compound command are its own', async () => {
    const node = await first('coproc X { cat; } 2>/dev/null') as { body: { redirections: unknown[] } };

    assertEquals(node.body.redirections.length, 1);
  });

  await t.step('is a word anywhere but where a command starts', async () => {
    assertEquals(await first('echo coproc x'), { type: 'Command', name: word('echo'), suffix: [word('coproc'), word('x')] });
  });
});
