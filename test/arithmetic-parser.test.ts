import { assertEquals, assertThrows } from '@std/assert';
import { Lexer } from '../src/arithmetic/lexer.ts';
import { Parser } from '../src/arithmetic/parser.ts';

function parse(input: string) {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, input);
  return parser.parse();
}

Deno.test('arithmetic parser', async (t) => {
  // Binary operators
  await t.step('addition', () => {
    const result = parse('1 + 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '+');
    assertEquals((result as any).left.value, 1);
    assertEquals((result as any).right.value, 2);
  });

  await t.step('subtraction', () => {
    const result = parse('5 - 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '-');
  });

  await t.step('multiplication', () => {
    const result = parse('4 * 5');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '*');
  });

  await t.step('division', () => {
    const result = parse('10 / 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '/');
  });

  await t.step('modulo', () => {
    const result = parse('7 % 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '%');
  });

  await t.step('exponentiation', () => {
    const result = parse('2 ** 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '**');
    assertEquals((result as any).left.value, 2);
    assertEquals((result as any).right.value, 3);
  });

  // Bitwise operators
  await t.step('bitwise AND', () => {
    const result = parse('5 & 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '&');
  });

  await t.step('bitwise OR', () => {
    const result = parse('5 | 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '|');
  });

  await t.step('bitwise XOR', () => {
    const result = parse('5 ^ 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '^');
  });

  await t.step('left shift', () => {
    const result = parse('2 << 3');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '<<');
  });

  await t.step('right shift', () => {
    const result = parse('16 >> 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '>>');
  });

  // Comparison operators
  await t.step('less than', () => {
    const result = parse('1 < 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '<');
  });

  await t.step('greater than', () => {
    const result = parse('3 > 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '>');
  });

  await t.step('less than or equal', () => {
    const result = parse('1 <= 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '<=');
  });

  await t.step('greater than or equal', () => {
    const result = parse('3 >= 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '>=');
  });

  await t.step('equality', () => {
    const result = parse('1 == 1');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '==');
  });

  await t.step('inequality', () => {
    const result = parse('1 != 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '!=');
  });

  // Logical operators
  await t.step('logical AND', () => {
    const result = parse('1 && 2');
    assertEquals(result.type, 'LogicalExpression');
    assertEquals((result as any).operator, '&&');
  });

  await t.step('logical OR', () => {
    const result = parse('0 || 1');
    assertEquals(result.type, 'LogicalExpression');
    assertEquals((result as any).operator, '||');
  });

  // Unary operators
  await t.step('unary minus', () => {
    const result = parse('-5');
    assertEquals(result.type, 'UnaryExpression');
    assertEquals((result as any).operator, '-');
    assertEquals((result as any).prefix, true);
    assertEquals((result as any).argument.value, 5);
  });

  await t.step('unary plus', () => {
    const result = parse('+5');
    assertEquals(result.type, 'UnaryExpression');
    assertEquals((result as any).operator, '+');
    assertEquals((result as any).prefix, true);
  });

  await t.step('logical NOT', () => {
    const result = parse('!0');
    assertEquals(result.type, 'UnaryExpression');
    assertEquals((result as any).operator, '!');
    assertEquals((result as any).prefix, true);
  });

  await t.step('bitwise NOT', () => {
    const result = parse('~5');
    assertEquals(result.type, 'UnaryExpression');
    assertEquals((result as any).operator, '~');
    assertEquals((result as any).prefix, true);
  });

  // Update operators (prefix)
  await t.step('prefix increment', () => {
    const result = parse('++x');
    assertEquals(result.type, 'UpdateExpression');
    assertEquals((result as any).operator, '++');
    assertEquals((result as any).prefix, true);
    assertEquals((result as any).argument.name, 'x');
  });

  await t.step('prefix decrement', () => {
    const result = parse('--x');
    assertEquals(result.type, 'UpdateExpression');
    assertEquals((result as any).operator, '--');
    assertEquals((result as any).prefix, true);
  });

  // Update operators (postfix)
  await t.step('postfix increment', () => {
    const result = parse('x++');
    assertEquals(result.type, 'UpdateExpression');
    assertEquals((result as any).operator, '++');
    assertEquals((result as any).prefix, false);
    assertEquals((result as any).argument.name, 'x');
  });

  await t.step('postfix decrement', () => {
    const result = parse('x--');
    assertEquals(result.type, 'UpdateExpression');
    assertEquals((result as any).operator, '--');
    assertEquals((result as any).prefix, false);
  });

  // Ternary operator
  await t.step('ternary conditional', () => {
    const result = parse('1 ? 2 : 3');
    assertEquals(result.type, 'ConditionalExpression');
    assertEquals((result as any).test.value, 1);
    assertEquals((result as any).consequent.value, 2);
    assertEquals((result as any).alternate.value, 3);
  });

  // Comma operator (sequence expression)
  await t.step('comma sequence', () => {
    const result = parse('1, 2');
    assertEquals(result.type, 'SequenceExpression');
    assertEquals((result as any).expressions.length, 2);
    assertEquals((result as any).expressions[0].value, 1);
    assertEquals((result as any).expressions[1].value, 2);
  });

  await t.step('comma sequence with multiple expressions', () => {
    const result = parse('1, 2, 3, 4');
    assertEquals(result.type, 'SequenceExpression');
    assertEquals((result as any).expressions.length, 4);
  });

  // Assignment operators
  await t.step('simple assignment', () => {
    const result = parse('x = 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '=');
    assertEquals((result as any).left.name, 'x');
    assertEquals((result as any).right.value, 5);
  });

  await t.step('addition assignment', () => {
    const result = parse('x += 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '+=');
  });

  await t.step('subtraction assignment', () => {
    const result = parse('x -= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '-=');
  });

  await t.step('multiplication assignment', () => {
    const result = parse('x *= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '*=');
  });

  await t.step('division assignment', () => {
    const result = parse('x /= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '/=');
  });

  await t.step('modulo assignment', () => {
    const result = parse('x %= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '%=');
  });

  await t.step('bitwise AND assignment', () => {
    const result = parse('x &= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '&=');
  });

  await t.step('bitwise OR assignment', () => {
    const result = parse('x |= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '|=');
  });

  await t.step('bitwise XOR assignment', () => {
    const result = parse('x ^= 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '^=');
  });

  await t.step('left shift assignment', () => {
    const result = parse('x <<= 2');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '<<=');
  });

  await t.step('right shift assignment', () => {
    const result = parse('x >>= 2');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '>>=');
  });

  // Parenthesized expressions
  await t.step('parenthesized expression', () => {
    const result = parse('(1 + 2)');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '+');
  });

  await t.step('nested parentheses', () => {
    const result = parse('((1 + 2))');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '+');
  });

  // Identifiers
  await t.step('simple identifier', () => {
    const result = parse('foo');
    assertEquals(result.type, 'Identifier');
    assertEquals((result as any).name, 'foo');
  });

  await t.step('identifier with underscore', () => {
    const result = parse('_bar');
    assertEquals(result.type, 'Identifier');
    assertEquals((result as any).name, '_bar');
  });

  await t.step('identifier with $ prefix', () => {
    const result = parse('$var');
    assertEquals(result.type, 'Identifier');
    assertEquals((result as any).name, 'var');
  });

  // Number formats
  await t.step('decimal number', () => {
    const result = parse('42');
    assertEquals(result.type, 'NumericLiteral');
    assertEquals((result as any).value, 42);
    assertEquals((result as any).extra.raw, '42');
  });

  await t.step('hexadecimal number', () => {
    const result = parse('0xFF');
    assertEquals(result.type, 'NumericLiteral');
    assertEquals((result as any).value, 255);
  });

  await t.step('binary number', () => {
    const result = parse('0b1010');
    assertEquals(result.type, 'NumericLiteral');
    assertEquals((result as any).value, 10);
  });

  await t.step('octal number', () => {
    const result = parse('0777');
    assertEquals(result.type, 'NumericLiteral');
    assertEquals((result as any).value, 511);
  });

  // Operator precedence
  await t.step('multiplication before addition', () => {
    const result = parse('2 + 3 * 4');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '+');
    assertEquals((result as any).left.value, 2);
    assertEquals((result as any).right.operator, '*');
  });

  await t.step('parentheses override precedence', () => {
    const result = parse('(2 + 3) * 4');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '*');
    assertEquals((result as any).left.operator, '+');
    assertEquals((result as any).right.value, 4);
  });

  await t.step('exponentiation before multiplication', () => {
    const result = parse('2 * 3 ** 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '*');
    assertEquals((result as any).right.operator, '**');
  });

  await t.step('comparison before equality', () => {
    const result = parse('1 < 2 == 3 > 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '==');
    assertEquals((result as any).left.operator, '<');
    assertEquals((result as any).right.operator, '>');
  });

  await t.step('logical AND before logical OR', () => {
    const result = parse('1 || 2 && 3');
    assertEquals(result.type, 'LogicalExpression');
    assertEquals((result as any).operator, '||');
    assertEquals((result as any).right.operator, '&&');
  });

  // Right associativity
  await t.step('exponentiation is right associative', () => {
    const result = parse('2 ** 3 ** 2');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '**');
    assertEquals((result as any).left.value, 2);
    assertEquals((result as any).right.operator, '**');
  });

  await t.step('assignment is right associative', () => {
    const result = parse('a = b = 5');
    assertEquals(result.type, 'AssignmentExpression');
    assertEquals((result as any).operator, '=');
    assertEquals((result as any).right.type, 'AssignmentExpression');
  });

  // Complex expressions
  await t.step('complex expression', () => {
    const result = parse('a + b * c - d / e');
    assertEquals(result.type, 'BinaryExpression');
    assertEquals((result as any).operator, '-');
  });

  await t.step('ternary with expressions', () => {
    const result = parse('x > 0 ? x : -x');
    assertEquals(result.type, 'ConditionalExpression');
    assertEquals((result as any).test.operator, '>');
    assertEquals((result as any).consequent.name, 'x');
    assertEquals((result as any).alternate.operator, '-');
  });

  // Error cases
  await t.step('throws on unexpected token', () => {
    assertThrows(
      () => parse('1 + + +'),
      SyntaxError,
    );
  });

  await t.step('throws on incomplete expression', () => {
    assertThrows(
      () => parse('1 +'),
      SyntaxError,
    );
  });

  await t.step('throws on invalid update expression left-hand side', () => {
    assertThrows(
      () => parse('1++'),
      SyntaxError,
      'Invalid left-hand side in update expression',
    );
  });

  await t.step('throws on invalid assignment left-hand side', () => {
    assertThrows(
      () => parse('1 = 2'),
      SyntaxError,
      'Invalid left-hand side in assignment',
    );
  });

  await t.step('throws on unexpected token at end', () => {
    assertThrows(
      () => parse('1 + 2 3'),
      SyntaxError,
      'Unexpected token: 3',
    );
  });

  // `++1` is +(+1) in bash; only an operator with nothing after it is an error
  await t.step('throws on a prefix operator without an operand', () => {
    assertThrows(() => parse('++'), SyntaxError);
  });

  await t.step('throws on missing colon in ternary', () => {
    assertThrows(
      () => parse('1 ? 2'),
      SyntaxError,
      'Expected COLON',
    );
  });

  await t.step('throws on missing right paren', () => {
    assertThrows(
      () => parse('(1 + 2'),
      SyntaxError,
      'Expected RPAREN',
    );
  });
});

Deno.test('arithmetic parser: what bash accepts beyond C', async (t) => {
  await t.step('an array element keeps its subscript text and parses it', () => {
    const result = parse('a[i + 1]') as any;
    assertEquals(result.type, 'Identifier');
    assertEquals(result.name, 'a');
    assertEquals(result.subscript, 'i + 1');
    assertEquals(result.index.type, 'BinaryExpression');
  });

  await t.step('an element can be updated and assigned', () => {
    assertEquals((parse('a[0]++') as any).argument.subscript, '0');
    assertEquals((parse('m[k] += 2') as any).left.subscript, 'k');
  });

  await t.step('a subscript that is not arithmetic keeps only its text', () => {
    const result = parse('m[a b]') as any;
    assertEquals(result.subscript, 'a b');
    assertEquals(result.index, undefined);
  });

  await t.step('base#digits', () => {
    assertEquals((parse('16#ff') as any).value, 255);
    assertEquals((parse('2#101') as any).value, 5);
    assertEquals((parse('36#Z') as any).value, 35);
    assertEquals((parse('64#@_') as any).value, 4031);
  });

  await t.step('a digit too large for its base is an error', () => {
    assertThrows(() => parse('2#102'));
    assertThrows(() => parse('65#1'));
  });

  await t.step('++ and -- before a non-variable are two signs', () => {
    const result = parse('++7') as any;
    assertEquals(result.type, 'UnaryExpression');
    assertEquals(result.argument.type, 'UnaryExpression');
    assertEquals(result.argument.argument.value, 7);
  });
});
