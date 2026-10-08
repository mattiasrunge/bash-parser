/**
 * Utilities for working with source locations.
 */

import type { ErrorPosition } from '../errors.ts';

/**
 * Computes row (1-indexed) and column (1-indexed) from a character offset (0-indexed).
 *
 * @param source - The full source string
 * @param char - 0-indexed character offset from the start of source
 * @returns Position with row, col (both 1-indexed), and char (0-indexed)
 *
 * @example
 * ```typescript
 * const source = 'line1\nline2\nline3';
 * positionFromOffset(source, 7);  // { row: 2, col: 2, char: 7 } - 'i' in 'line2'
 * ```
 */
export function positionFromOffset(source: string, char: number): ErrorPosition {
  let row = 1;
  let col = 1;

  for (let i = 0; i < char && i < source.length; i++) {
    if (source[i] === '\n') {
      row++;
      col = 1;
    } else {
      col++;
    }
  }

  return { row, col, char };
}
