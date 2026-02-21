import type { ProtectedRange } from '../tokenizer/types.ts';
import unescape from './unescape.ts';
import unquoteWord, { type ParseResult } from './unquote-word.ts';

// Placeholder characters that are unlikely to appear in shell input
// Used to temporarily escape quotes in protected ranges
const DOUBLE_QUOTE_PLACEHOLDER = '\x00DQ\x00';
const SINGLE_QUOTE_PLACEHOLDER = '\x00SQ\x00';
const BACKSLASH_PLACEHOLDER = '\x00BS\x00';

/**
 * Escape quote characters in protected content with placeholders.
 * This prevents them from being processed during quote removal.
 * Note: We do NOT escape spaces/tabs here - word splitting on whitespace
 * should still occur for unquoted expansions (e.g., `for i in $(echo a b c)`).
 * The quoting of the original expansion (e.g., "$var" vs $var) determines
 * whether word splitting occurs, which is handled before this stage.
 */
const escapeProtectedContent = (content: string): string => {
  return content
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/"/g, DOUBLE_QUOTE_PLACEHOLDER)
    .replace(/'/g, SINGLE_QUOTE_PLACEHOLDER);
};

/**
 * Restore placeholders to their original characters.
 */
const restorePlaceholders = (text: string): string => {
  return text
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\')
    .replace(new RegExp(DOUBLE_QUOTE_PLACEHOLDER, 'g'), '"')
    .replace(new RegExp(SINGLE_QUOTE_PLACEHOLDER, 'g'), "'");
};

/**
 * Unquote a string, removing bash quote characters.
 */
export const unquote = (text: string): string => {
  const result = unquoteWord(text);

  if (result.values.length === 0) {
    return text;
  }

  if (result.comment) {
    return '';
  }

  return unescape(result.values[0]);
};

/**
 * Unquote text while preserving protected ranges (content from expansions).
 * Returns a single string (first word only if there's word splitting).
 *
 * @param text - The text to unquote
 * @param protectedRanges - Ranges that should not have quote removal applied
 * @returns The unquoted text with protected ranges preserved (first word only)
 */
export const unquoteWithProtectedRanges = (text: string, protectedRanges: ProtectedRange[]): string => {
  const result = unquoteWordWithProtectedRanges(text, protectedRanges);
  if (result.values.length === 0) {
    return text;
  }
  return result.values[0];
};

/**
 * Unquote text while preserving protected ranges (content from expansions).
 * Returns all words (preserves word splitting behavior).
 *
 * This follows POSIX shell semantics where quote removal only applies to
 * characters that were part of the original command syntax, not characters
 * that resulted from parameter/command/arithmetic expansion.
 *
 * Strategy: temporarily replace quote characters in protected ranges with
 * placeholders, run normal unquoteWord, then restore the placeholders.
 * Word splitting still occurs on whitespace.
 *
 * @param text - The text to unquote
 * @param protectedRanges - Ranges that should not have quote removal applied
 * @returns ParseResult with unquoted values, preserving protected range content
 */
export const unquoteWordWithProtectedRanges = (text: string, protectedRanges: ProtectedRange[]): ParseResult => {
  if (!protectedRanges || protectedRanges.length === 0) {
    const result = unquoteWord(text);
    return {
      values: result.values.map(unescape),
      comment: result.comment,
    };
  }

  // Sort ranges by start position (descending) so we can replace from end to start
  // without invalidating positions
  const sortedRanges = [...protectedRanges].sort((a, b) => b.start - a.start);

  // Replace special characters in protected ranges with placeholders
  let escaped = text;
  for (const range of sortedRanges) {
    const protectedContent = escaped.slice(range.start, range.end);
    const escapedContent = escapeProtectedContent(protectedContent);
    escaped = escaped.slice(0, range.start) + escapedContent + escaped.slice(range.end);
  }

  // Run normal unquoteWord
  const result = unquoteWord(escaped);

  // Restore placeholders to actual characters in all values
  return {
    values: result.values.map((v) => restorePlaceholders(unescape(v))),
    comment: result.comment,
  };
};

/**
 * Remove shell quotes without word splitting.
 * Used for assignment values where POSIX forbids field splitting.
 */
const removeQuotes = (text: string): string => {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (isEscaped) {
      result += c;
      isEscaped = false;
    } else if (inSingle) {
      if (c === "'") {
        inSingle = false;
      } else {
        result += c;
      }
    } else if (inDouble) {
      if (c === '"') {
        inDouble = false;
      } else if (c === '\\') {
        const next = text[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          result += next;
          i++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    } else if (c === "'") {
      inSingle = true;
    } else if (c === '"') {
      inDouble = true;
    } else if (c === '\\') {
      isEscaped = true;
    } else {
      result += c;
    }
  }

  return result;
};

/**
 * Quote removal for assignment values - no word splitting.
 * POSIX: Variable assignments do not undergo field splitting.
 */
export const unquoteAssignmentWithProtectedRanges = (
  text: string,
  protectedRanges: ProtectedRange[],
): string => {
  if (!protectedRanges || protectedRanges.length === 0) {
    return removeQuotes(text);
  }

  const sortedRanges = [...protectedRanges].sort((a, b) => b.start - a.start);

  let escaped = text;
  for (const range of sortedRanges) {
    const content = escaped.slice(range.start, range.end);
    escaped = escaped.slice(0, range.start) + escapeProtectedContent(content) + escaped.slice(range.end);
  }

  return restorePlaceholders(removeQuotes(escaped));
};

export default unquoteWithProtectedRanges;
