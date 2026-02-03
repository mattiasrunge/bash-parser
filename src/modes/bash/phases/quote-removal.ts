import type { LexerPhase } from '../../../lexer/types.ts';
import type { Expansion, ProtectedRange, TokenIf } from '../../../tokenizer/mod.ts';
import map from '../../../utils/iterable/map.ts';
import unescape from '../../../utils/unescape.ts';
import unquoteWord from '../../../utils/unquote-word.ts';

const unquote = (text: string) => {
  const result = unquoteWord(text);

  if (result.values.length === 0) {
    return text;
  }

  if (result.comment) {
    return '';
  }

  return unescape(result.values[0]);
};

// Placeholder characters that are unlikely to appear in shell input
// Used to temporarily escape quotes in protected ranges
const DOUBLE_QUOTE_PLACEHOLDER = '\x00DQ\x00';
const SINGLE_QUOTE_PLACEHOLDER = '\x00SQ\x00';
const BACKSLASH_PLACEHOLDER = '\x00BS\x00';

/**
 * Unquote text while preserving protected ranges (content from expansions).
 * Protected ranges contain literal values from variable/command expansion
 * and should NOT have quote removal applied to them.
 *
 * Strategy: temporarily replace quote characters in protected ranges with
 * placeholders, run normal unquote, then restore the placeholders.
 */
const unquoteWithProtectedRanges = (text: string, protectedRanges: ProtectedRange[]): string => {
  if (protectedRanges.length === 0) {
    return unquote(text);
  }

  // Sort ranges by start position (descending) so we can replace from end to start
  // without invalidating positions
  const sortedRanges = [...protectedRanges].sort((a, b) => b.start - a.start);

  // Replace quotes in protected ranges with placeholders
  let escaped = text;
  for (const range of sortedRanges) {
    const protectedContent = escaped.slice(range.start, range.end);
    const escapedContent = protectedContent
      .replace(/\\/g, BACKSLASH_PLACEHOLDER)
      .replace(/"/g, DOUBLE_QUOTE_PLACEHOLDER)
      .replace(/'/g, SINGLE_QUOTE_PLACEHOLDER);
    escaped = escaped.slice(0, range.start) + escapedContent + escaped.slice(range.end);
  }

  // Run normal unquote
  const unquoted = unquote(escaped);

  // Restore placeholders to actual characters
  return unquoted
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\')
    .replace(new RegExp(DOUBLE_QUOTE_PLACEHOLDER, 'g'), '"')
    .replace(new RegExp(SINGLE_QUOTE_PLACEHOLDER, 'g'), "'");
};

const unresolvedExpansions = (token: TokenIf) => {
  if (!token.expansion) {
    return false;
  }

  return token.expansion.some((xp: Expansion) => !xp.resolved);
};

const quoteRemoval: LexerPhase = () =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!unresolvedExpansions(token)) {
        if (token.protectedRanges && token.protectedRanges.length > 0) {
          return token.setValue(unquoteWithProtectedRanges(token.value!, token.protectedRanges));
        }
        return token.setValue(unquote(token.value!));
      }
    }

    return token;
  });

export default quoteRemoval;
