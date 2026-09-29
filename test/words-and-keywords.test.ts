import { assertEquals } from '@std/assert';
import bashParser from '../src/parse.ts';

const words = async (source: string) => (((await bashParser(source)).commands[0] as any).suffix as { text: string }[]).map((w) => w.text);

Deno.test('the function keyword', async (t) => {
  for (const source of ['function f { echo a; }', 'function f() { echo a; }', 'function f\n{ echo a; }', 'f() { echo a; }']) {
    await t.step(JSON.stringify(source), async () => {
      const command = (await bashParser(source)).commands[0] as any;
      assertEquals(command.type, 'Function');
      assertEquals(command.name.text, 'f');
    });
  }

  await t.step('a name bash allows only after the keyword', async () => {
    assertEquals(((await bashParser('function foo-bar { :; }')).commands[0] as any).name.text, 'foo-bar');
  });

  await t.step('as an argument it is a word', async () => {
    assertEquals(await words('echo function x'), ['function', 'x']);
  });
});

Deno.test('braces as words', async (t) => {
  await t.step('} closes a group only where a command could start', async () => {
    assertEquals(await words('echo { }'), ['{', '}']);
    assertEquals(await words('echo }'), ['}']);
  });

  await t.step('groups still close', async () => {
    for (const source of ['{ echo a; }', '{ echo a\n}', '{ if true; then :; fi }', 'f() { (echo a) }']) {
      await bashParser(source);
    }
  });
});

Deno.test('where a parameter expansion ends', async (t) => {
  await t.step('a quoted } or one in a substitution does not end it', async () => {
    assertEquals(await words('echo ${HOME-"}"}'), ['${HOME-"}"}']);
    assertEquals(await words('echo ${x:-$(echo })}'), ['${x:-$(echo })}']);
  });

  await t.step('plain braces do not pair, as in bash', async () => {
    assertEquals(await words('echo ${a:-G { I } K }'), ['${a:-G { I }', 'K', '}']);
  });
});

Deno.test('case item terminators', async () => {
  const result = await bashParser('case x in a) ;; b) ;& c) ;;& d) esac');
  const items = (result.commands[0] as any).cases as { terminator?: string }[];
  assertEquals(items.map((item) => item.terminator), [undefined, ';&', ';;&', undefined]);
});

Deno.test('grammar bash allows beyond POSIX', async (t) => {
  const first = async (source: string) => (await bashParser(source)).commands[0] as any;

  await t.step('select, with and without in', async () => {
    assertEquals((await first('select i in a b; do echo; done')).type, 'Select');
    assertEquals((await first('select i; do echo; done')).wordlist, undefined);
  });

  await t.step('for name; do', async () => {
    assertEquals((await first('for i; do echo; done')).type, 'For');
  });

  await t.step('(( )), a reserved word after )), a { } body for for (( ))', async () => {
    assertEquals((await first('(( ))')).type, 'ArithmeticCommand');
    assertEquals((await first('if ((1)) then ((2)) fi')).type, 'If');
    assertEquals((await first('for ((i=0; i<3; i++)) { echo $i; }')).type, 'ArithmeticFor');
  });

  await t.step('$(( )) ends after its own groups', async () => {
    const word = (await first('echo $((1 ? 20 : (x+=2)))')).suffix[0];
    assertEquals(word.expansion[0].expression, '1 ? 20 : (x+=2)');
  });

  await t.step('! counted: even cancels, alone negates nothing', async () => {
    assertEquals((await first('! ! true')).bang, undefined);
    assertEquals((await first('! ! ! true')).bang, true);
    assertEquals((await first('!')).bang, true);
  });
});

Deno.test('more of what bash accepts', async (t) => {
  const parses = async (source: string) => (await bashParser(source)).commands[0] as any;

  await t.step('an empty command substitution', async () => {
    assertEquals((await parses('echo ab$()cd')).suffix[0].expansion[0].command, '');
  });

  await t.step('a code point past Unicode is nothing', async () => {
    assertEquals((await parses("echo $'\\Uffffffff'x")).suffix[0].text, 'x');
  });

  await t.step('|& pipes stderr too', async () => {
    const left = (await parses('a |& b')).commands[0];
    assertEquals(left.suffix[0].op.text, '>&');
    assertEquals(left.suffix[0].numberIo.text, '2');
  });

  await t.step('case with in on its own line, and esac as a pattern', async () => {
    assertEquals((await parses('case "$w"\nin\n foo) ;;\nesac')).type, 'Case');
    assertEquals((await parses('case esac in (esac) echo;; esac')).cases[0].pattern[0].text, 'esac');
    assertEquals((await parses('case k in else|done|esac) :;; esac')).cases[0].pattern.length, 3);
    assertEquals((await parses('case ni in esac')).type, 'Case');
  });

  await t.step('(( and $(( that are subshells', async () => {
    assertEquals((await parses('((echo a; echo b); echo c)')).type, 'Subshell');
    assertEquals((await parses('echo $((echo a);(echo b))')).suffix[0].expansion[0].type, 'CommandExpansion');
    assertEquals((await parses('echo $(( (1+2)*3 ))')).suffix[0].expansion[0].type, 'ArithmeticExpansion');
  });
});

Deno.test('extended patterns are part of their word', async () => {
  const words = async (source: string) => (((await bashParser(source)).commands[0] as any).suffix as { text: string }[]).map((w) => w.text);

  assertEquals(await words('echo *.@(c|h) a*!(x) +([[:alpha:].]) x'), ['*.@(c|h)', 'a*!(x)', '+([[:alpha:].])', 'x']);
  assertEquals(await words('echo @(a|"q r"|$p)'), ['@(a|"q r"|$p)']);
  assertEquals(await words('echo <(printf hi) >(cat)'), ['<(printf hi)', '>(cat)']);
});

Deno.test('comments in arrays, any for name, joined here-document lines, backslashes in backticks', async (t) => {
  const first = async (source: string) => (await bashParser(source)).commands[0] as any;

  await t.step('a comment inside an array literal', async () => {
    const word = (await first('x=(\n a # one\n b # two\n)')).prefix[0];
    assertEquals(word.text, 'x=(a\x1fb)');
  });

  await t.step('for 1 in parses; the executor rejects the name', async () => {
    assertEquals((await first('for 1 in a; do :; done')).name.text, '1');
  });

  await t.step('a backslash-newline joins here-document lines, the delimiter too', async () => {
    const redirect = (await first('cat << EOF\nhi \\\nthere\nEO\\\nF\n')).suffix[0];
    assertEquals(redirect.heredoc.body, 'hi there\n');
  });

  await t.step('between backticks a backslash quotes only $ ` and \\', async () => {
    assertEquals((await first('echo `echo "(\\")"`')).suffix[0].expansion[0].command, 'echo "(\\")"');
    assertEquals((await first('echo `echo \\$x`')).suffix[0].expansion[0].command, 'echo $x');
    assertEquals((await first('echo `echo foo\\\nbar`')).suffix[0].expansion[0].command, 'echo foobar');
  });
});
