/**
 * Arithmetic expression parser for bash $((...)) syntax
 */

export { Lexer } from './lexer.ts';
export { Parser } from './parser.ts';

import type { AstArithmeticExpression } from '../ast/types.ts';
import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';

/**
 * Options for parsing arithmetic expressions.
 */
export type ParseArithmeticOptions = {
  /** Offset in source where expression starts (for absolute positions in AST) */
  sourceOffset?: number;
};

/**
 * Parse an arithmetic expression string into an AST.
 *
 * @param expression - The arithmetic expression to parse (e.g., "42 + 43")
 * @param options - Optional parsing options
 * @returns The parsed AST
 * @throws ArithmeticSyntaxError if the expression is invalid
 */
export function parseArithmetic(
  expression: string,
  options?: ParseArithmeticOptions,
): AstArithmeticExpression {
  const sourceOffset = options?.sourceOffset ?? 0;
  const lexer = new Lexer(expression, sourceOffset);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, expression, sourceOffset);
  return parser.parse();
}

/**
 * Parse an arithmetic expression the way bash's own parser treats one: not at
 * all. Bash only balances the parentheses of `$(( ))` and `(( ))`; the text is
 * expanded and evaluated when it runs, so `$(( 16#ff ))`, `(( a[i]++ ))` or
 * even `(( -- ))` never make a script a syntax error. This parses what it can
 * ahead of time and returns undefined for the rest, which the executor then
 * parses after expansion.
 *
 * @param expression - The arithmetic expression to parse
 * @param options - Optional parsing options
 * @returns The parsed AST, or undefined when the text is not arithmetic as written
 */
export function tryParseArithmetic(
  expression: string,
  options?: ParseArithmeticOptions,
): AstArithmeticExpression | undefined {
  try {
    return parseArithmetic(expression, options);
  } catch {
    return undefined;
  }
}
