/**
 * Arithmetic expression parser for bash $((...)) syntax
 */

export * from './types.ts';
export { Lexer } from './lexer.ts';
export { Parser } from './parser.ts';

import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import type { Expression } from './types.ts';

/**
 * Parse an arithmetic expression string into an AST.
 *
 * @param expression - The arithmetic expression to parse (e.g., "42 + 43")
 * @returns The parsed AST
 * @throws SyntaxError if the expression is invalid
 */
export function parseArithmetic(expression: string): Expression {
  const lexer = new Lexer(expression);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}
