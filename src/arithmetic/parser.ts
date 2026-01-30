/**
 * Pratt parser for arithmetic expressions
 */

import type { Token, TokenType } from './tokens.ts';
import { BashSyntaxError } from '~/errors.ts';
import type {
  AstArithmeticAssignmentExpression,
  AstArithmeticAssignmentOperator,
  AstArithmeticBinaryExpression,
  AstArithmeticBinaryOperator,
  AstArithmeticCommandSubstitution,
  AstArithmeticConditionalExpression,
  AstArithmeticExpression,
  AstArithmeticIdentifier,
  AstArithmeticLogicalExpression,
  AstArithmeticNumericLiteral,
  AstArithmeticSequenceExpression,
  AstArithmeticUnaryExpression,
  AstArithmeticUpdateExpression,
  AstSourceLocation,
} from '~/ast/types.ts';

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
  private expression: string;
  private sourceOffset: number;

  constructor(tokens: Token[], expression: string, sourceOffset: number = 0) {
    this.tokens = tokens;
    this.expression = expression;
    this.sourceOffset = sourceOffset;
  }

  private createError(message: string, token?: Token): BashSyntaxError {
    const localOffset = token?.start ?? this.current().start;
    // Apply sourceOffset to get absolute position in the full source
    return BashSyntaxError.fromPosition(message, this.expression, { char: this.sourceOffset + localOffset });
  }

  parse(): AstArithmeticExpression {
    const expr = this.parseExpression(Precedence.NONE);

    if (this.current().type !== 'EOF') {
      throw this.createError(`Unexpected token: ${this.current().value}`);
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
      throw this.createError(`Expected ${type}, got ${token.type}`, token);
    }
    return this.advance();
  }

  private parseExpression(minPrecedence: Precedence): AstArithmeticExpression {
    let left = this.parsePrefixExpression();

    while (true) {
      const token = this.current();
      const precedence = getInfixPrecedence(token.type);

      if (precedence <= minPrecedence) break;

      left = this.parseInfixExpression(left, precedence);
    }

    return left;
  }

  private parsePrefixExpression(): AstArithmeticExpression {
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

    // Command substitution: $(...)
    if (token.type === 'COMMAND_SUBSTITUTION') {
      return this.parseCommandSubstitution();
    }

    throw this.createError(`Unexpected token: ${token.value || token.type}`, token);
  }

  private parseInfixExpression(left: AstArithmeticExpression, precedence: Precedence): AstArithmeticExpression {
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

  private parseUnaryExpression(): AstArithmeticUnaryExpression {
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
      loc: {
        start: { char: this.sourceOffset + token.start },
        end: { char: argument.loc?.end?.char ?? (this.sourceOffset + token.end) },
      },
    };
  }

  private parsePrefixUpdateExpression(): AstArithmeticUpdateExpression {
    const token = this.advance();

    if (this.current().type !== 'IDENTIFIER') {
      throw this.createError('Expected identifier after prefix operator');
    }

    const argument = this.parseIdentifier();

    return {
      type: 'UpdateExpression',
      operator: token.value as '++' | '--',
      prefix: true,
      argument,
      loc: {
        start: { char: this.sourceOffset + token.start },
        end: { char: argument.loc?.end?.char ?? (this.sourceOffset + token.end) },
      },
    };
  }

  private createUpdateExpression(left: AstArithmeticExpression, token: Token, prefix: boolean): AstArithmeticUpdateExpression {
    if (left.type !== 'Identifier') {
      throw this.createError('Invalid left-hand side in update expression', token);
    }

    return {
      type: 'UpdateExpression',
      operator: token.value as '++' | '--',
      prefix,
      argument: left,
      loc: {
        start: { char: left.loc?.start?.char ?? 0 },
        end: { char: this.sourceOffset + token.end },
      },
    };
  }

  private parseParenthesized(): AstArithmeticExpression {
    this.advance(); // consume '('
    const expr = this.parseExpression(Precedence.NONE);
    this.expect('RPAREN');
    return expr;
  }

  private parseNumber(): AstArithmeticNumericLiteral {
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
      loc: this.createLoc(token.start, token.end),
    };
  }

  private parseIdentifier(): AstArithmeticIdentifier {
    const token = this.advance();
    // Remove $ prefix if present for the name
    const name = token.value.startsWith('$') ? token.value.slice(1) : token.value;

    return {
      type: 'Identifier',
      name,
      loc: this.createLoc(token.start, token.end),
    };
  }

  private parseCommandSubstitution(): AstArithmeticCommandSubstitution {
    const token = this.advance();

    return {
      type: 'CommandSubstitution',
      command: token.value,
      loc: this.createLoc(token.start, token.end),
    };
  }

  private parseTernary(test: AstArithmeticExpression, _questionToken: Token): AstArithmeticConditionalExpression {
    const consequent = this.parseExpression(Precedence.NONE);
    this.expect('COLON');
    const alternate = this.parseExpression(Precedence.TERNARY);

    return {
      type: 'ConditionalExpression',
      test,
      consequent,
      alternate,
      loc: this.createLocFromChildren(test.loc, alternate.loc),
    };
  }

  private parseSequence(first: AstArithmeticExpression, _commaToken: Token): AstArithmeticSequenceExpression {
    const expressions: AstArithmeticExpression[] = [first];

    // Parse the rest of the sequence
    expressions.push(this.parseExpression(Precedence.COMMA));

    // Continue if more commas
    while (this.current().type === 'COMMA') {
      this.advance();
      expressions.push(this.parseExpression(Precedence.COMMA));
    }

    const lastExpr = expressions[expressions.length - 1];
    return {
      type: 'SequenceExpression',
      expressions,
      loc: this.createLocFromChildren(first.loc, lastExpr.loc),
    };
  }

  private parseAssignment(left: AstArithmeticExpression, token: Token): AstArithmeticAssignmentExpression {
    if (left.type !== 'Identifier') {
      throw this.createError('Invalid left-hand side in assignment', token);
    }

    const operatorMap: Record<string, AstArithmeticAssignmentOperator> = {
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
      loc: this.createLocFromChildren(left.loc, right.loc),
    };
  }

  private createBinaryExpression(left: AstArithmeticExpression, token: Token, right: AstArithmeticExpression): AstArithmeticBinaryExpression {
    const operatorMap: Record<string, AstArithmeticBinaryOperator> = {
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
      loc: this.createLocFromChildren(left.loc, right.loc),
    };
  }

  private createLogicalExpression(left: AstArithmeticExpression, token: Token, right: AstArithmeticExpression): AstArithmeticLogicalExpression {
    return {
      type: 'LogicalExpression',
      operator: token.type === 'AMPERSAND_AMPERSAND' ? '&&' : '||',
      left,
      right,
      loc: this.createLocFromChildren(left.loc, right.loc),
    };
  }

  private createLoc(start: number, end: number): AstSourceLocation {
    // Apply source offset to get absolute positions in the source
    // Row/col are omitted as they cannot be accurately computed without newline tracking
    return {
      start: {
        char: this.sourceOffset + start,
      },
      end: {
        char: this.sourceOffset + end,
      },
    };
  }

  // Create location from child node locations (no offset needed as children already have it)
  private createLocFromChildren(
    startLoc: AstSourceLocation | undefined,
    endLoc: AstSourceLocation | undefined,
  ): AstSourceLocation {
    return {
      start: {
        char: startLoc?.start?.char ?? 0,
      },
      end: {
        char: endLoc?.end?.char ?? 0,
      },
    };
  }
}
