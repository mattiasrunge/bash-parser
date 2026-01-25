/**
 * Pratt parser for arithmetic expressions
 */

import type { Token, TokenType } from './tokens.ts';
import type {
  AssignmentExpression,
  AssignmentOperator,
  BinaryExpression,
  BinaryOperator,
  ConditionalExpression,
  Expression,
  Identifier,
  LogicalExpression,
  NumericLiteral,
  SequenceExpression,
  SourceLocation,
  UnaryExpression,
  UpdateExpression,
} from './types.ts';

// Precedence levels (from lowest to highest, matching C/bash)
const enum Precedence {
  NONE = 0,
  COMMA = 1,
  ASSIGNMENT = 2,
  TERNARY = 3,
  LOGICAL_OR = 4,
  LOGICAL_AND = 5,
  BITWISE_OR = 6,
  BITWISE_XOR = 7,
  BITWISE_AND = 8,
  EQUALITY = 9,
  RELATIONAL = 10,
  SHIFT = 11,
  ADDITIVE = 12,
  MULTIPLICATIVE = 13,
  EXPONENT = 14,
  UNARY = 15,
  POSTFIX = 16,
}

// Map token types to their infix precedence
function getInfixPrecedence(type: TokenType): Precedence {
  switch (type) {
    case 'COMMA':
      return Precedence.COMMA;
    case 'EQUALS':
    case 'PLUS_EQUALS':
    case 'MINUS_EQUALS':
    case 'STAR_EQUALS':
    case 'SLASH_EQUALS':
    case 'PERCENT_EQUALS':
    case 'AMPERSAND_EQUALS':
    case 'PIPE_EQUALS':
    case 'CARET_EQUALS':
    case 'LESS_LESS_EQUALS':
    case 'GREATER_GREATER_EQUALS':
      return Precedence.ASSIGNMENT;
    case 'QUESTION':
      return Precedence.TERNARY;
    case 'PIPE_PIPE':
      return Precedence.LOGICAL_OR;
    case 'AMPERSAND_AMPERSAND':
      return Precedence.LOGICAL_AND;
    case 'PIPE':
      return Precedence.BITWISE_OR;
    case 'CARET':
      return Precedence.BITWISE_XOR;
    case 'AMPERSAND':
      return Precedence.BITWISE_AND;
    case 'EQUALS_EQUALS':
    case 'BANG_EQUALS':
      return Precedence.EQUALITY;
    case 'LESS':
    case 'GREATER':
    case 'LESS_EQUALS':
    case 'GREATER_EQUALS':
      return Precedence.RELATIONAL;
    case 'LESS_LESS':
    case 'GREATER_GREATER':
      return Precedence.SHIFT;
    case 'PLUS':
    case 'MINUS':
      return Precedence.ADDITIVE;
    case 'STAR':
    case 'SLASH':
    case 'PERCENT':
      return Precedence.MULTIPLICATIVE;
    case 'STAR_STAR':
      return Precedence.EXPONENT;
    case 'PLUS_PLUS':
    case 'MINUS_MINUS':
      return Precedence.POSTFIX;
    default:
      return Precedence.NONE;
  }
}

// Check if an operator is right-associative
function isRightAssociative(type: TokenType): boolean {
  switch (type) {
    case 'STAR_STAR':
    case 'EQUALS':
    case 'PLUS_EQUALS':
    case 'MINUS_EQUALS':
    case 'STAR_EQUALS':
    case 'SLASH_EQUALS':
    case 'PERCENT_EQUALS':
    case 'AMPERSAND_EQUALS':
    case 'PIPE_EQUALS':
    case 'CARET_EQUALS':
    case 'LESS_LESS_EQUALS':
    case 'GREATER_GREATER_EQUALS':
      return true;
    default:
      return false;
  }
}

// Check if token is an assignment operator
function isAssignmentOperator(type: TokenType): boolean {
  switch (type) {
    case 'EQUALS':
    case 'PLUS_EQUALS':
    case 'MINUS_EQUALS':
    case 'STAR_EQUALS':
    case 'SLASH_EQUALS':
    case 'PERCENT_EQUALS':
    case 'AMPERSAND_EQUALS':
    case 'PIPE_EQUALS':
    case 'CARET_EQUALS':
    case 'LESS_LESS_EQUALS':
    case 'GREATER_GREATER_EQUALS':
      return true;
    default:
      return false;
  }
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expression {
    const expr = this.parseExpression(Precedence.NONE);

    if (this.current().type !== 'EOF') {
      throw new SyntaxError(`Unexpected token: ${this.current().value}`);
    }

    return expr;
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new SyntaxError(`Expected ${type}, got ${token.type}`);
    }
    return this.advance();
  }

  private parseExpression(minPrecedence: Precedence): Expression {
    let left = this.parsePrefixExpression();

    while (true) {
      const token = this.current();
      const precedence = getInfixPrecedence(token.type);

      if (precedence <= minPrecedence) break;

      left = this.parseInfixExpression(left, precedence);
    }

    return left;
  }

  private parsePrefixExpression(): Expression {
    const token = this.current();

    // Unary operators: - + ! ~
    if (
      token.type === 'MINUS' ||
      token.type === 'PLUS' ||
      token.type === 'BANG' ||
      token.type === 'TILDE'
    ) {
      return this.parseUnaryExpression();
    }

    // Prefix increment/decrement: ++x, --x
    if (token.type === 'PLUS_PLUS' || token.type === 'MINUS_MINUS') {
      return this.parsePrefixUpdateExpression();
    }

    // Parenthesized expression
    if (token.type === 'LPAREN') {
      return this.parseParenthesized();
    }

    // Number literal
    if (token.type === 'NUMBER') {
      return this.parseNumber();
    }

    // Identifier
    if (token.type === 'IDENTIFIER') {
      return this.parseIdentifier();
    }

    throw new SyntaxError(`Unexpected token: ${token.value || token.type}`);
  }

  private parseInfixExpression(left: Expression, precedence: Precedence): Expression {
    const token = this.advance();

    // Postfix increment/decrement: x++, x--
    if (token.type === 'PLUS_PLUS' || token.type === 'MINUS_MINUS') {
      return this.createUpdateExpression(left, token, false);
    }

    // Ternary conditional: a ? b : c
    if (token.type === 'QUESTION') {
      return this.parseTernary(left, token);
    }

    // Comma (sequence expression)
    if (token.type === 'COMMA') {
      return this.parseSequence(left, token);
    }

    // Assignment operators
    if (isAssignmentOperator(token.type)) {
      return this.parseAssignment(left, token);
    }

    // Binary operators
    const rightPrecedence = isRightAssociative(token.type) ? precedence - 1 : precedence;
    const right = this.parseExpression(rightPrecedence);

    // Logical operators get their own node type (matching Babel)
    if (token.type === 'AMPERSAND_AMPERSAND' || token.type === 'PIPE_PIPE') {
      return this.createLogicalExpression(left, token, right);
    }

    return this.createBinaryExpression(left, token, right);
  }

  private parseUnaryExpression(): UnaryExpression {
    const token = this.advance();
    const argument = this.parseExpression(Precedence.UNARY);

    const operatorMap: Record<string, '-' | '+' | '!' | '~'> = {
      MINUS: '-',
      PLUS: '+',
      BANG: '!',
      TILDE: '~',
    };

    return {
      type: 'UnaryExpression',
      operator: operatorMap[token.type],
      prefix: true,
      argument,
      start: token.start,
      end: argument.end,
      loc: this.createLoc(token.start, argument.end),
    };
  }

  private parsePrefixUpdateExpression(): UpdateExpression {
    const token = this.advance();

    if (this.current().type !== 'IDENTIFIER') {
      throw new SyntaxError('Expected identifier after prefix operator');
    }

    const argument = this.parseIdentifier();

    return {
      type: 'UpdateExpression',
      operator: token.value as '++' | '--',
      prefix: true,
      argument,
      start: token.start,
      end: argument.end,
      loc: this.createLoc(token.start, argument.end),
    };
  }

  private createUpdateExpression(left: Expression, token: Token, prefix: boolean): UpdateExpression {
    if (left.type !== 'Identifier') {
      throw new SyntaxError('Invalid left-hand side in update expression');
    }

    return {
      type: 'UpdateExpression',
      operator: token.value as '++' | '--',
      prefix,
      argument: left,
      start: left.start,
      end: token.end,
      loc: this.createLoc(left.start, token.end),
    };
  }

  private parseParenthesized(): Expression {
    this.advance(); // consume '('
    const expr = this.parseExpression(Precedence.NONE);
    this.expect('RPAREN');
    return expr;
  }

  private parseNumber(): NumericLiteral {
    const token = this.advance();
    const raw = token.value;
    let value: number;

    // Parse based on prefix
    if (raw.startsWith('0x') || raw.startsWith('0X')) {
      value = parseInt(raw, 16);
    } else if (raw.startsWith('0b') || raw.startsWith('0B')) {
      value = parseInt(raw.slice(2), 2);
    } else if (raw.startsWith('0') && raw.length > 1 && !raw.includes('.')) {
      // Octal (bash style: 0777)
      value = parseInt(raw, 8);
    } else {
      value = parseInt(raw, 10);
    }

    return {
      type: 'NumericLiteral',
      value,
      extra: {
        rawValue: value,
        raw,
      },
      start: token.start,
      end: token.end,
      loc: this.createLoc(token.start, token.end),
    };
  }

  private parseIdentifier(): Identifier {
    const token = this.advance();
    // Remove $ prefix if present for the name
    const name = token.value.startsWith('$') ? token.value.slice(1) : token.value;

    return {
      type: 'Identifier',
      name,
      start: token.start,
      end: token.end,
      loc: this.createLoc(token.start, token.end),
    };
  }

  private parseTernary(test: Expression, questionToken: Token): ConditionalExpression {
    const consequent = this.parseExpression(Precedence.NONE);
    this.expect('COLON');
    const alternate = this.parseExpression(Precedence.TERNARY);

    return {
      type: 'ConditionalExpression',
      test,
      consequent,
      alternate,
      start: test.start,
      end: alternate.end,
      loc: this.createLoc(test.start, alternate.end),
    };
  }

  private parseSequence(first: Expression, commaToken: Token): SequenceExpression {
    const expressions: Expression[] = [first];

    // Parse the rest of the sequence
    expressions.push(this.parseExpression(Precedence.COMMA));

    // Continue if more commas
    while (this.current().type === 'COMMA') {
      this.advance();
      expressions.push(this.parseExpression(Precedence.COMMA));
    }

    return {
      type: 'SequenceExpression',
      expressions,
      start: first.start,
      end: expressions[expressions.length - 1].end,
      loc: this.createLoc(first.start, expressions[expressions.length - 1].end),
    };
  }

  private parseAssignment(left: Expression, token: Token): AssignmentExpression {
    if (left.type !== 'Identifier') {
      throw new SyntaxError('Invalid left-hand side in assignment');
    }

    const operatorMap: Record<string, AssignmentOperator> = {
      EQUALS: '=',
      PLUS_EQUALS: '+=',
      MINUS_EQUALS: '-=',
      STAR_EQUALS: '*=',
      SLASH_EQUALS: '/=',
      PERCENT_EQUALS: '%=',
      AMPERSAND_EQUALS: '&=',
      PIPE_EQUALS: '|=',
      CARET_EQUALS: '^=',
      LESS_LESS_EQUALS: '<<=',
      GREATER_GREATER_EQUALS: '>>=',
    };

    const right = this.parseExpression(Precedence.ASSIGNMENT - 1);

    return {
      type: 'AssignmentExpression',
      operator: operatorMap[token.type],
      left,
      right,
      start: left.start,
      end: right.end,
      loc: this.createLoc(left.start, right.end),
    };
  }

  private createBinaryExpression(left: Expression, token: Token, right: Expression): BinaryExpression {
    const operatorMap: Record<string, BinaryOperator> = {
      PLUS: '+',
      MINUS: '-',
      STAR: '*',
      SLASH: '/',
      PERCENT: '%',
      STAR_STAR: '**',
      AMPERSAND: '&',
      PIPE: '|',
      CARET: '^',
      LESS_LESS: '<<',
      GREATER_GREATER: '>>',
      LESS: '<',
      GREATER: '>',
      LESS_EQUALS: '<=',
      GREATER_EQUALS: '>=',
      EQUALS_EQUALS: '==',
      BANG_EQUALS: '!=',
    };

    return {
      type: 'BinaryExpression',
      operator: operatorMap[token.type],
      left,
      right,
      start: left.start,
      end: right.end,
      loc: this.createLoc(left.start, right.end),
    };
  }

  private createLogicalExpression(left: Expression, token: Token, right: Expression): LogicalExpression {
    return {
      type: 'LogicalExpression',
      operator: token.type === 'AMPERSAND_AMPERSAND' ? '&&' : '||',
      left,
      right,
      start: left.start,
      end: right.end,
      loc: this.createLoc(left.start, right.end),
    };
  }

  private createLoc(start: number, end: number): SourceLocation {
    // Calculate line/column from offsets
    // For simplicity, assuming single-line expressions (which is typical for arithmetic)
    return {
      start: {
        line: 1,
        column: start,
        index: start,
      },
      end: {
        line: 1,
        column: end,
        index: end,
      },
    };
  }
}
