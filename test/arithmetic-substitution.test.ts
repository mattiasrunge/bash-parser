import { assertEquals, assertRejects } from '@std/assert';
import bashParser from '~/parse.ts';
import utils from './_utils.ts';

Deno.test('arithmetic substitution', async (t) => {
  await t.step('arithmetic substitution', async () => {
    const result = await bashParser('variable=$((42 + 43))');
    delete (result as any).commands[0].prefix[0].expansion[0].arithmeticAST;
    // console.log(JSON.stringify(result.commands[0].prefix[0]))
    utils.checkResults((result as any).commands[0].prefix[0], {
      text: 'variable=$((42 + 43))',
      type: 'AssignmentWord',
      expansion: [{
        expression: '42 + 43',
        type: 'ArithmeticExpansion',
        loc: {
          start: 9,
          end: 20,
        },
      }],
    });
  });

  await t.step('arithmetic substitution skip single quoted words', async () => {
    const result = await bashParser("echo '$((42 * 42))'");
    // utils.logResults(result)
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '$((42 * 42))',
    }]);
  });

  await t.step('arithmetic substitution skip escaped dollar', async () => {
    const result = await bashParser('echo "\\$(\\(42 * 42))"');
    // utils.logResults(result)
    // In bash, \$ inside double quotes becomes $ (backslash removed)
    // \( stays as \( since ( is not a special char inside double quotes
    utils.checkResults((result as any).commands[0].suffix, [{
      type: 'Word',
      text: '$(\\(42 * 42))',
    }]);
  });

  await t.step('arithmetic & parameter substitution', async () => {
    const result = await bashParser('variable=$((42 + 43)) $ciao');

    delete (result as any).commands[0].prefix[0].expansion[0].arithmeticAST;
    // utils.logResults(result.commands[0].name);
    utils.checkResults((result as any).commands[0].prefix[0], {
      text: 'variable=$((42 + 43))',
      type: 'AssignmentWord',
      expansion: [{
        expression: '42 + 43',
        type: 'ArithmeticExpansion',
        loc: {
          start: 9,
          end: 20,
        },
      }],
    });

    utils.checkResults((result as any).commands[0].name, {
      text: '$ciao',
      type: 'Word',
      expansion: [{
        type: 'ParameterExpansion',
        parameter: 'ciao',
        loc: {
          start: 0,
          end: 4,
        },
      }],
    });
  });

  await t.step('arithmetic substitution in suffix', async () => {
    const result = await bashParser('echo $((42 + 43))');
    delete (result as any).commands[0].suffix[0].expansion[0].arithmeticAST;
    utils.checkResults((result as any).commands[0].suffix[0], {
      type: 'Word',
      text: '$((42 + 43))',
      expansion: [{
        expression: '42 + 43',
        type: 'ArithmeticExpansion',
        loc: {
          start: 0,
          end: 11,
        },
      }],
    });
  });

  await t.step('arithmetic substitution node applied to invalid expressions throws', async () => {
    const result = (await assertRejects(() => bashParser('echo $((a b c d))'))) as Error;
    const message = result.message.split('\n')[0];
    // Location is now stored separately from message, not embedded
    assertEquals(message, 'Unexpected token: b');
  });

  await t.step('arithmetic substitution node applied to non expressions throws', async () => {
    const result = (await assertRejects(() => bashParser('echo $((while(1);))'))) as Error;
    const message = result.message.split('\n')[0];
    // Location is now stored separately from message, not embedded
    assertEquals(message, 'Unexpected character: ;');
  });

  await t.step('arithmetic ast is parsed', async () => {
    const result = await bashParser('variable=$((42 + 43))');

    // utils.logResults(result)
    // Positions are absolute: token starts at 0, expansion at 9, expression content at 12
    utils.checkResults((result as any).commands[0].prefix[0].expansion[0].arithmeticAST, {
      type: 'BinaryExpression',
      loc: {
        start: {
          char: 12,
        },
        end: {
          char: 19,
        },
      },
      left: {
        type: 'NumericLiteral',
        loc: {
          start: {
            char: 12,
          },
          end: {
            char: 14,
          },
        },
        extra: {
          rawValue: 42,
          raw: '42',
        },
        value: 42,
      },
      operator: '+',
      right: {
        type: 'NumericLiteral',
        loc: {
          start: {
            char: 17,
          },
          end: {
            char: 19,
          },
        },
        extra: {
          rawValue: 43,
          raw: '43',
        },
        value: 43,
      },
    });
  });

  await t.step('resolve expression', async () => {
    const result = await bashParser('"foo $((42 * 42)) baz"', {
      async runArithmeticExpression() {
        return '43';
      },
    });
    delete (result as any).commands[0].name.expansion[0].arithmeticAST;

    // utils.logResults(result.commands[0]);
    utils.checkResults(result.commands[0], {
      type: 'Command',
      name: {
        text: 'foo 43 baz',
        originalText: '"foo $((42 * 42)) baz"',
        expansion: [{
          expression: '42 * 42',
          loc: {
            start: 5,
            end: 16,
          },
          resolved: true,
          type: 'ArithmeticExpansion',
        }],
        type: 'Word',
      },
    });
  });

  await t.step('field splitting', async () => {
    const result = await bashParser('say $((other)) plz', {
      async runArithmeticExpression() {
        return 'foo\tbar baz';
      },

      async resolveEnv() {
        return '\t ';
      },
    });
    delete (result as any).commands[0].suffix[0].expansion[0].arithmeticAST;
    delete (result as any).commands[0].suffix[1].expansion[0].arithmeticAST;
    delete (result as any).commands[0].suffix[2].expansion[0].arithmeticAST;

    // utils.logResults(result)

    utils.checkResults(result.commands[0], {
      type: 'Command',
      name: {
        text: 'say',
        type: 'Word',
      },
      suffix: [{
        text: 'foo',
        expansion: [{
          expression: 'other',
          loc: {
            start: 0,
            end: 9,
          },
          type: 'ArithmeticExpansion',
          resolved: true,
        }],
        originalText: '$((other))',
        type: 'Word',
        joined: 'foo\u0000bar\u0000baz',
        fieldIdx: 0,
      }, {
        text: 'bar',
        expansion: [{
          expression: 'other',
          loc: {
            start: 0,
            end: 9,
          },
          type: 'ArithmeticExpansion',
          resolved: true,
        }],
        originalText: '$((other))',
        type: 'Word',
        joined: 'foo\u0000bar\u0000baz',
        fieldIdx: 1,
      }, {
        text: 'baz',
        expansion: [{
          expression: 'other',
          loc: {
            start: 0,
            end: 9,
          },
          type: 'ArithmeticExpansion',
          resolved: true,
        }],
        originalText: '$((other))',
        type: 'Word',
        joined: 'foo\u0000bar\u0000baz',
        fieldIdx: 2,
      }, {
        text: 'plz',
        type: 'Word',
      }],
    });
  });

  await t.step('arithmetic command (( expr ))', async () => {
    const result = await bashParser('(( 2 + 3 == 5 ))');
    // console.log(JSON.stringify(result.commands, null, 2));

    utils.checkResults(result.commands[0], {
      type: 'ArithmeticCommand',
      expression: '2 + 3 == 5',
      arithmeticAST: {
        type: 'BinaryExpression',
        operator: '==',
        left: {
          type: 'BinaryExpression',
          operator: '+',
          left: {
            type: 'NumericLiteral',
            value: 2,
          },
          right: {
            type: 'NumericLiteral',
            value: 3,
          },
        },
        right: {
          type: 'NumericLiteral',
          value: 5,
        },
      },
    });
  });

  await t.step('command substitution inside arithmetic', async () => {
    const result = await bashParser('echo $(($(echo 5) + 3))');
    // utils.logResults(result)

    const expansion = (result as any).commands[0].suffix[0].expansion[0];
    utils.checkResults(expansion.type, 'ArithmeticExpansion');
    utils.checkResults(expansion.expression, '$(echo 5) + 3');

    // Check that the arithmetic AST contains a CommandSubstitution node
    const arithmeticAST = expansion.arithmeticAST;
    utils.checkResults(arithmeticAST.type, 'BinaryExpression');
    utils.checkResults(arithmeticAST.operator, '+');
    utils.checkResults(arithmeticAST.left.type, 'CommandSubstitution');
    utils.checkResults(arithmeticAST.left.command, 'echo 5');

    // Verify the command is recursively parsed
    utils.checkResults(arithmeticAST.left.commandAST.type, 'Script');
    utils.checkResults(arithmeticAST.left.commandAST.commands[0].name.text, 'echo');
  });

  await t.step('multiple command substitutions inside arithmetic', async () => {
    const result = await bashParser('echo $(($(echo 5) + $(echo 3)))');

    const expansion = (result as any).commands[0].suffix[0].expansion[0];
    utils.checkResults(expansion.expression, '$(echo 5) + $(echo 3)');

    const arithmeticAST = expansion.arithmeticAST;
    utils.checkResults(arithmeticAST.left.type, 'CommandSubstitution');
    utils.checkResults(arithmeticAST.left.command, 'echo 5');
    utils.checkResults(arithmeticAST.right.type, 'CommandSubstitution');
    utils.checkResults(arithmeticAST.right.command, 'echo 3');
  });

  await t.step('nested command substitution inside arithmetic', async () => {
    const result = await bashParser('echo $(($(echo $(echo 5)) + 1))');

    const expansion = (result as any).commands[0].suffix[0].expansion[0];
    utils.checkResults(expansion.expression, '$(echo $(echo 5)) + 1');

    const arithmeticAST = expansion.arithmeticAST;
    utils.checkResults(arithmeticAST.left.type, 'CommandSubstitution');
    utils.checkResults(arithmeticAST.left.command, 'echo $(echo 5)');

    // The inner command should also be recursively parsed
    const innerCmd = arithmeticAST.left.commandAST.commands[0];
    utils.checkResults(innerCmd.suffix[0].expansion[0].type, 'CommandExpansion');
    utils.checkResults(innerCmd.suffix[0].expansion[0].command, 'echo 5');
  });

  await t.step('command substitution with complex expression', async () => {
    const result = await bashParser('x=$(($(cat count.txt) * 2 + $(wc -l < file.txt)))');

    const expansion = (result as any).commands[0].prefix[0].expansion[0];
    utils.checkResults(expansion.type, 'ArithmeticExpansion');

    const arithmeticAST = expansion.arithmeticAST;
    // (($(cat count.txt) * 2) + $(wc -l < file.txt))
    utils.checkResults(arithmeticAST.type, 'BinaryExpression');
    utils.checkResults(arithmeticAST.operator, '+');
    utils.checkResults(arithmeticAST.left.type, 'BinaryExpression');
    utils.checkResults(arithmeticAST.left.operator, '*');
    utils.checkResults(arithmeticAST.left.left.type, 'CommandSubstitution');
    utils.checkResults(arithmeticAST.right.type, 'CommandSubstitution');
  });
});
