/**
 * Lexer for arithmetic expressions
 */

import type { Token, TokenType } from './tokens.ts';

export class Lexer {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const token = this.nextToken();
      tokens.push(token);
    }

    tokens.push({
      type: 'EOF',
      value: '',
      start: this.pos,
      end: this.pos,
    });

    return tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private nextToken(): Token {
    const char = this.input[this.pos];

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber();
    }

    // Identifiers (variables): start with letter, _, or $
    if (this.isIdentifierStart(char)) {
      return this.readIdentifier();
    }

    // Operators and punctuation
    return this.readOperator();
  }

  private readNumber(): Token {
    const start = this.pos;
    let value = '';

    // Handle hex (0x), binary (0b), or octal (0...)
    if (this.input[this.pos] === '0' && this.pos + 1 < this.input.length) {
      const next = this.input[this.pos + 1].toLowerCase();

      if (next === 'x') {
        // Hexadecimal: 0xFF
        value = this.input.slice(this.pos, this.pos + 2);
        this.pos += 2;
        while (this.pos < this.input.length && this.isHexDigit(this.input[this.pos])) {
          value += this.input[this.pos++];
        }
        return { type: 'NUMBER', value, start, end: this.pos };
      }

      if (next === 'b') {
        // Binary: 0b1010
        value = this.input.slice(this.pos, this.pos + 2);
        this.pos += 2;
        while (this.pos < this.input.length && (this.input[this.pos] === '0' || this.input[this.pos] === '1')) {
          value += this.input[this.pos++];
        }
        return { type: 'NUMBER', value, start, end: this.pos };
      }

      if (this.isOctalDigit(next)) {
        // Octal: 0777 (bash style, leading zero)
        value = this.input[this.pos++];
        while (this.pos < this.input.length && this.isOctalDigit(this.input[this.pos])) {
          value += this.input[this.pos++];
        }
        return { type: 'NUMBER', value, start, end: this.pos };
      }
    }

    // Decimal
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos])) {
      value += this.input[this.pos++];
    }

    return { type: 'NUMBER', value, start, end: this.pos };
  }

  private readIdentifier(): Token {
    const start = this.pos;
    let value = '';

    // Handle optional $ prefix for variables
    if (this.input[this.pos] === '$') {
      // Check for command substitution: $(...)
      if (this.input[this.pos + 1] === '(') {
        return this.readCommandSubstitution();
      }
      value = '$';
      this.pos++;
    }

    // Read identifier characters
    while (this.pos < this.input.length && this.isIdentifierPart(this.input[this.pos])) {
      value += this.input[this.pos++];
    }

    return { type: 'IDENTIFIER', value, start, end: this.pos };
  }

  private readCommandSubstitution(): Token {
    const start = this.pos;
    this.pos += 2; // skip $(

    let depth = 1;
    let command = '';

    while (this.pos < this.input.length && depth > 0) {
      const char = this.input[this.pos];

      if (char === '(') {
        depth++;
        command += char;
      } else if (char === ')') {
        depth--;
        if (depth > 0) {
          command += char;
        }
        // else: this closes the command substitution, don't add to command
      } else {
        command += char;
      }
      this.pos++;
    }

    if (depth !== 0) {
      throw new SyntaxError('Unclosed command substitution in arithmetic expression');
    }

    return { type: 'COMMAND_SUBSTITUTION', value: command, start, end: this.pos };
  }

  private readOperator(): Token {
    const start = this.pos;
    const char = this.input[this.pos];
    const next = this.input[this.pos + 1];
    const nextNext = this.input[this.pos + 2];

    // Three-character operators
    if (char === '<' && next === '<' && nextNext === '=') {
      this.pos += 3;
      return { type: 'LESS_LESS_EQUALS', value: '<<=', start, end: this.pos };
    }
    if (char === '>' && next === '>' && nextNext === '=') {
      this.pos += 3;
      return { type: 'GREATER_GREATER_EQUALS', value: '>>=', start, end: this.pos };
    }

    // Two-character operators
    if (char === '*' && next === '*') {
      this.pos += 2;
      return { type: 'STAR_STAR', value: '**', start, end: this.pos };
    }
    if (char === '<' && next === '<') {
      this.pos += 2;
      return { type: 'LESS_LESS', value: '<<', start, end: this.pos };
    }
    if (char === '>' && next === '>') {
      this.pos += 2;
      return { type: 'GREATER_GREATER', value: '>>', start, end: this.pos };
    }
    if (char === '<' && next === '=') {
      this.pos += 2;
      return { type: 'LESS_EQUALS', value: '<=', start, end: this.pos };
    }
    if (char === '>' && next === '=') {
      this.pos += 2;
      return { type: 'GREATER_EQUALS', value: '>=', start, end: this.pos };
    }
    if (char === '=' && next === '=') {
      this.pos += 2;
      return { type: 'EQUALS_EQUALS', value: '==', start, end: this.pos };
    }
    if (char === '!' && next === '=') {
      this.pos += 2;
      return { type: 'BANG_EQUALS', value: '!=', start, end: this.pos };
    }
    if (char === '&' && next === '&') {
      this.pos += 2;
      return { type: 'AMPERSAND_AMPERSAND', value: '&&', start, end: this.pos };
    }
    if (char === '|' && next === '|') {
      this.pos += 2;
      return { type: 'PIPE_PIPE', value: '||', start, end: this.pos };
    }
    if (char === '+' && next === '+') {
      this.pos += 2;
      return { type: 'PLUS_PLUS', value: '++', start, end: this.pos };
    }
    if (char === '-' && next === '-') {
      this.pos += 2;
      return { type: 'MINUS_MINUS', value: '--', start, end: this.pos };
    }
    if (char === '+' && next === '=') {
      this.pos += 2;
      return { type: 'PLUS_EQUALS', value: '+=', start, end: this.pos };
    }
    if (char === '-' && next === '=') {
      this.pos += 2;
      return { type: 'MINUS_EQUALS', value: '-=', start, end: this.pos };
    }
    if (char === '*' && next === '=') {
      this.pos += 2;
      return { type: 'STAR_EQUALS', value: '*=', start, end: this.pos };
    }
    if (char === '/' && next === '=') {
      this.pos += 2;
      return { type: 'SLASH_EQUALS', value: '/=', start, end: this.pos };
    }
    if (char === '%' && next === '=') {
      this.pos += 2;
      return { type: 'PERCENT_EQUALS', value: '%=', start, end: this.pos };
    }
    if (char === '&' && next === '=') {
      this.pos += 2;
      return { type: 'AMPERSAND_EQUALS', value: '&=', start, end: this.pos };
    }
    if (char === '|' && next === '=') {
      this.pos += 2;
      return { type: 'PIPE_EQUALS', value: '|=', start, end: this.pos };
    }
    if (char === '^' && next === '=') {
      this.pos += 2;
      return { type: 'CARET_EQUALS', value: '^=', start, end: this.pos };
    }

    // Single-character operators
    const singleCharOps: Record<string, TokenType> = {
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'STAR',
      '/': 'SLASH',
      '%': 'PERCENT',
      '&': 'AMPERSAND',
      '|': 'PIPE',
      '^': 'CARET',
      '~': 'TILDE',
      '<': 'LESS',
      '>': 'GREATER',
      '=': 'EQUALS',
      '!': 'BANG',
      '?': 'QUESTION',
      ':': 'COLON',
      ',': 'COMMA',
      '(': 'LPAREN',
      ')': 'RPAREN',
    };

    const type = singleCharOps[char];
    if (type) {
      this.pos++;
      return { type, value: char, start, end: this.pos };
    }

    throw new SyntaxError(`Unexpected character: ${char}`);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isHexDigit(char: string): boolean {
    return this.isDigit(char) || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F');
  }

  private isOctalDigit(char: string): boolean {
    return char >= '0' && char <= '7';
  }

  private isIdentifierStart(char: string): boolean {
    return (
      char === '$' ||
      char === '_' ||
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z')
    );
  }

  private isIdentifierPart(char: string): boolean {
    return (
      char === '_' ||
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      (char >= '0' && char <= '9')
    );
  }
}
