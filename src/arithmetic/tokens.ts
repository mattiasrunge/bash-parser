/**
 * Token types for arithmetic expression lexer
 */

export type TokenType =
  // Literals
  | 'NUMBER'
  | 'IDENTIFIER'
  // Single-char operators
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'AMPERSAND'
  | 'PIPE'
  | 'CARET'
  | 'TILDE'
  | 'LESS'
  | 'GREATER'
  | 'EQUALS'
  | 'BANG'
  | 'QUESTION'
  | 'COLON'
  | 'COMMA'
  // Multi-char operators
  | 'STAR_STAR' // **
  | 'LESS_LESS' // <<
  | 'GREATER_GREATER' // >>
  | 'LESS_EQUALS' // <=
  | 'GREATER_EQUALS' // >=
  | 'EQUALS_EQUALS' // ==
  | 'BANG_EQUALS' // !=
  | 'AMPERSAND_AMPERSAND' // &&
  | 'PIPE_PIPE' // ||
  | 'PLUS_PLUS' // ++
  | 'MINUS_MINUS' // --
  | 'PLUS_EQUALS' // +=
  | 'MINUS_EQUALS' // -=
  | 'STAR_EQUALS' // *=
  | 'SLASH_EQUALS' // /=
  | 'PERCENT_EQUALS' // %=
  | 'AMPERSAND_EQUALS' // &=
  | 'PIPE_EQUALS' // |=
  | 'CARET_EQUALS' // ^=
  | 'LESS_LESS_EQUALS' // <<=
  | 'GREATER_GREATER_EQUALS' // >>=
  // Grouping
  | 'LPAREN'
  | 'RPAREN'
  // Control
  | 'EOF';

export type Token = {
  type: TokenType;
  value: string;
  start: number;
  end: number;
};
