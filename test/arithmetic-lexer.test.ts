import { assertEquals, assertThrows } from '@std/assert';
import { Lexer } from '../src/arithmetic/lexer.ts';

function tokenize(input: string) {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}

function getTypes(tokens: ReturnType<typeof tokenize>) {
  return tokens.map((t) => t.type);
}

Deno.test('arithmetic lexer', async (t) => {
  // Numbers
  await t.step('decimal number', () => {
    const tokens = tokenize('42');
    assertEquals(tokens.length, 2); // NUMBER + EOF
    assertEquals(tokens[0].type, 'NUMBER');
    assertEquals(tokens[0].value, '42');
  });

  await t.step('multi-digit decimal', () => {
    const tokens = tokenize('12345');
    assertEquals(tokens[0].value, '12345');
  });

  await t.step('hexadecimal lowercase', () => {
    const tokens = tokenize('0xff');
    assertEquals(tokens[0].type, 'NUMBER');
    assertEquals(tokens[0].value, '0xff');
  });

  await t.step('hexadecimal uppercase', () => {
    const tokens = tokenize('0XFF');
    assertEquals(tokens[0].value, '0XFF');
  });

  await t.step('hexadecimal with digits', () => {
    const tokens = tokenize('0x1a2b3c');
    assertEquals(tokens[0].value, '0x1a2b3c');
  });

  await t.step('binary lowercase', () => {
    const tokens = tokenize('0b1010');
    assertEquals(tokens[0].type, 'NUMBER');
    assertEquals(tokens[0].value, '0b1010');
  });

  await t.step('binary uppercase', () => {
    const tokens = tokenize('0B1100');
    assertEquals(tokens[0].value, '0B1100');
  });

  await t.step('octal', () => {
    const tokens = tokenize('0777');
    assertEquals(tokens[0].type, 'NUMBER');
    assertEquals(tokens[0].value, '0777');
  });

  await t.step('zero only', () => {
    const tokens = tokenize('0');
    assertEquals(tokens[0].value, '0');
  });

  // Identifiers
  await t.step('simple identifier', () => {
    const tokens = tokenize('foo');
    assertEquals(tokens[0].type, 'IDENTIFIER');
    assertEquals(tokens[0].value, 'foo');
  });

  await t.step('identifier with underscore', () => {
    const tokens = tokenize('_bar');
    assertEquals(tokens[0].type, 'IDENTIFIER');
    assertEquals(tokens[0].value, '_bar');
  });

  await t.step('identifier starting with underscore', () => {
    const tokens = tokenize('_123');
    assertEquals(tokens[0].value, '_123');
  });

  await t.step('identifier with $ prefix', () => {
    const tokens = tokenize('$var');
    assertEquals(tokens[0].type, 'IDENTIFIER');
    assertEquals(tokens[0].value, '$var');
  });

  await t.step('uppercase identifier', () => {
    const tokens = tokenize('FOO_BAR');
    assertEquals(tokens[0].value, 'FOO_BAR');
  });

  // Single-char operators
  await t.step('plus', () => {
    const tokens = tokenize('+');
    assertEquals(tokens[0].type, 'PLUS');
    assertEquals(tokens[0].value, '+');
  });

  await t.step('minus', () => {
    const tokens = tokenize('-');
    assertEquals(tokens[0].type, 'MINUS');
  });

  await t.step('star', () => {
    const tokens = tokenize('*');
    assertEquals(tokens[0].type, 'STAR');
  });

  await t.step('slash', () => {
    const tokens = tokenize('/');
    assertEquals(tokens[0].type, 'SLASH');
  });

  await t.step('percent', () => {
    const tokens = tokenize('%');
    assertEquals(tokens[0].type, 'PERCENT');
  });

  await t.step('ampersand', () => {
    const tokens = tokenize('&');
    assertEquals(tokens[0].type, 'AMPERSAND');
  });

  await t.step('pipe', () => {
    const tokens = tokenize('|');
    assertEquals(tokens[0].type, 'PIPE');
  });

  await t.step('caret', () => {
    const tokens = tokenize('^');
    assertEquals(tokens[0].type, 'CARET');
  });

  await t.step('tilde', () => {
    const tokens = tokenize('~');
    assertEquals(tokens[0].type, 'TILDE');
  });

  await t.step('less', () => {
    const tokens = tokenize('<');
    assertEquals(tokens[0].type, 'LESS');
  });

  await t.step('greater', () => {
    const tokens = tokenize('>');
    assertEquals(tokens[0].type, 'GREATER');
  });

  await t.step('equals', () => {
    const tokens = tokenize('=');
    assertEquals(tokens[0].type, 'EQUALS');
  });

  await t.step('bang', () => {
    const tokens = tokenize('!');
    assertEquals(tokens[0].type, 'BANG');
  });

  await t.step('question', () => {
    const tokens = tokenize('?');
    assertEquals(tokens[0].type, 'QUESTION');
  });

  await t.step('colon', () => {
    const tokens = tokenize(':');
    assertEquals(tokens[0].type, 'COLON');
  });

  await t.step('comma', () => {
    const tokens = tokenize(',');
    assertEquals(tokens[0].type, 'COMMA');
  });

  await t.step('lparen', () => {
    const tokens = tokenize('(');
    assertEquals(tokens[0].type, 'LPAREN');
  });

  await t.step('rparen', () => {
    const tokens = tokenize(')');
    assertEquals(tokens[0].type, 'RPAREN');
  });

  // Two-char operators
  await t.step('star star', () => {
    const tokens = tokenize('**');
    assertEquals(tokens[0].type, 'STAR_STAR');
    assertEquals(tokens[0].value, '**');
  });

  await t.step('less less', () => {
    const tokens = tokenize('<<');
    assertEquals(tokens[0].type, 'LESS_LESS');
  });

  await t.step('greater greater', () => {
    const tokens = tokenize('>>');
    assertEquals(tokens[0].type, 'GREATER_GREATER');
  });

  await t.step('less equals', () => {
    const tokens = tokenize('<=');
    assertEquals(tokens[0].type, 'LESS_EQUALS');
  });

  await t.step('greater equals', () => {
    const tokens = tokenize('>=');
    assertEquals(tokens[0].type, 'GREATER_EQUALS');
  });

  await t.step('equals equals', () => {
    const tokens = tokenize('==');
    assertEquals(tokens[0].type, 'EQUALS_EQUALS');
  });

  await t.step('bang equals', () => {
    const tokens = tokenize('!=');
    assertEquals(tokens[0].type, 'BANG_EQUALS');
  });

  await t.step('ampersand ampersand', () => {
    const tokens = tokenize('&&');
    assertEquals(tokens[0].type, 'AMPERSAND_AMPERSAND');
  });

  await t.step('pipe pipe', () => {
    const tokens = tokenize('||');
    assertEquals(tokens[0].type, 'PIPE_PIPE');
  });

  await t.step('plus plus', () => {
    const tokens = tokenize('++');
    assertEquals(tokens[0].type, 'PLUS_PLUS');
  });

  await t.step('minus minus', () => {
    const tokens = tokenize('--');
    assertEquals(tokens[0].type, 'MINUS_MINUS');
  });

  await t.step('plus equals', () => {
    const tokens = tokenize('+=');
    assertEquals(tokens[0].type, 'PLUS_EQUALS');
  });

  await t.step('minus equals', () => {
    const tokens = tokenize('-=');
    assertEquals(tokens[0].type, 'MINUS_EQUALS');
  });

  await t.step('star equals', () => {
    const tokens = tokenize('*=');
    assertEquals(tokens[0].type, 'STAR_EQUALS');
  });

  await t.step('slash equals', () => {
    const tokens = tokenize('/=');
    assertEquals(tokens[0].type, 'SLASH_EQUALS');
  });

  await t.step('percent equals', () => {
    const tokens = tokenize('%=');
    assertEquals(tokens[0].type, 'PERCENT_EQUALS');
  });

  await t.step('ampersand equals', () => {
    const tokens = tokenize('&=');
    assertEquals(tokens[0].type, 'AMPERSAND_EQUALS');
  });

  await t.step('pipe equals', () => {
    const tokens = tokenize('|=');
    assertEquals(tokens[0].type, 'PIPE_EQUALS');
  });

  await t.step('caret equals', () => {
    const tokens = tokenize('^=');
    assertEquals(tokens[0].type, 'CARET_EQUALS');
  });

  // Three-char operators
  await t.step('less less equals', () => {
    const tokens = tokenize('<<=');
    assertEquals(tokens[0].type, 'LESS_LESS_EQUALS');
    assertEquals(tokens[0].value, '<<=');
  });

  await t.step('greater greater equals', () => {
    const tokens = tokenize('>>=');
    assertEquals(tokens[0].type, 'GREATER_GREATER_EQUALS');
    assertEquals(tokens[0].value, '>>=');
  });

  // Whitespace handling
  await t.step('skips whitespace', () => {
    const tokens = tokenize('  1  +  2  ');
    assertEquals(getTypes(tokens), ['NUMBER', 'PLUS', 'NUMBER', 'EOF']);
  });

  await t.step('skips tabs', () => {
    const tokens = tokenize('\t1\t+\t2\t');
    assertEquals(getTypes(tokens), ['NUMBER', 'PLUS', 'NUMBER', 'EOF']);
  });

  await t.step('skips newlines', () => {
    const tokens = tokenize('1\n+\n2');
    assertEquals(getTypes(tokens), ['NUMBER', 'PLUS', 'NUMBER', 'EOF']);
  });

  // Token positions
  await t.step('tracks start and end positions', () => {
    const tokens = tokenize('foo + 123');
    assertEquals(tokens[0].start, 0);
    assertEquals(tokens[0].end, 3);
    assertEquals(tokens[1].start, 4);
    assertEquals(tokens[1].end, 5);
    assertEquals(tokens[2].start, 6);
    assertEquals(tokens[2].end, 9);
  });

  // Complex expressions
  await t.step('tokenizes complex expression', () => {
    const tokens = tokenize('a + b * c');
    assertEquals(
      getTypes(tokens),
      ['IDENTIFIER', 'PLUS', 'IDENTIFIER', 'STAR', 'IDENTIFIER', 'EOF'],
    );
  });

  await t.step('tokenizes parenthesized expression', () => {
    const tokens = tokenize('(a + b)');
    assertEquals(
      getTypes(tokens),
      ['LPAREN', 'IDENTIFIER', 'PLUS', 'IDENTIFIER', 'RPAREN', 'EOF'],
    );
  });

  await t.step('tokenizes ternary', () => {
    const tokens = tokenize('a ? b : c');
    assertEquals(
      getTypes(tokens),
      ['IDENTIFIER', 'QUESTION', 'IDENTIFIER', 'COLON', 'IDENTIFIER', 'EOF'],
    );
  });

  await t.step('tokenizes assignment', () => {
    const tokens = tokenize('x = 5');
    assertEquals(getTypes(tokens), ['IDENTIFIER', 'EQUALS', 'NUMBER', 'EOF']);
  });

  await t.step('tokenizes increment', () => {
    const tokens = tokenize('x++');
    assertEquals(getTypes(tokens), ['IDENTIFIER', 'PLUS_PLUS', 'EOF']);
  });

  // EOF token
  await t.step('empty input returns EOF', () => {
    const tokens = tokenize('');
    assertEquals(tokens.length, 1);
    assertEquals(tokens[0].type, 'EOF');
  });

  await t.step('whitespace only returns EOF', () => {
    const tokens = tokenize('   ');
    assertEquals(tokens.length, 1);
    assertEquals(tokens[0].type, 'EOF');
  });

  // Error cases
  await t.step('throws on unexpected character', () => {
    assertThrows(
      () => tokenize('@'),
      SyntaxError,
      'Unexpected character: @',
    );
  });

  await t.step('throws on invalid character in expression', () => {
    assertThrows(
      () => tokenize('1 + #'),
      SyntaxError,
      'Unexpected character: #',
    );
  });
});
