/**
 * Utilities for working with source locations.
 */

import type { ExpansionLocation, TokenLocation } from '~/tokenizer/types.ts';
import type { AstSourceLocation } from '~/ast/types.ts';
import type { ErrorPosition } from '~/errors.ts';

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

/**
 * Converts an expansion's relative location to an absolute source location.
 *
 * Expansion locations are relative to the word text they appear in.
 * This function converts them to absolute positions in the source.
 *
 * @param expansionLoc - The expansion's location relative to word text
 * @param wordLoc - The word's location in source
 * @returns Absolute source location
 *
 * @example
 * ```typescript
 * // For a word at position 10 with expansion at relative position 2-8:
 * const absoluteLoc = toAbsoluteLocation(
 *   { start: 2, end: 8 },
 *   { start: { char: 10 }, end: { char: 20 } }
 * );
 * // Returns: { start: { char: 12 }, end: { char: 18 } }
 * ```
 */
export function toAbsoluteLocation(expansionLoc: ExpansionLocation, wordLoc: TokenLocation): AstSourceLocation {
  const wordStartChar = wordLoc.start?.char ?? 0;

  return {
    start: {
      char: wordStartChar + expansionLoc.start,
    },
    end: {
      char: wordStartChar + expansionLoc.end,
    },
  };
}
