import type { LexerPhase } from '../../../lexer/types.ts';
import type { Expansion, ProtectedRange, TokenIf } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR, parseAssignmentWord } from '../../../utils/assignment.ts';
import map from '../../../utils/iterable/map.ts';
import { sliceRanges } from '../../../utils/unquote-with-ranges.ts';
import { unquoteSingleWord } from '../../../utils/unquote-word.ts';

// The token is one word by the time it gets here: the tokenizer split the line
// and took the comments out. Parsing it as a command line again split it a
// second time and kept only the first field — which is how `${x:?must be set}`
// came back as "must" — and read a `#` in it as the start of a comment, which
// emptied `echo red=#fff` altogether.
const unquote = (text: string) => unquoteSingleWord(text);

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

/**
 * Quote removal for an array literal, `a=(x "b c")`.
 *
 * The whole literal is one token but the elements are separate words, so quote
 * removal applies to each of them on its own — running it over the literal as a
 * whole would drop the parens (they are metacharacters) and keep only the first
 * word.
 */
const unquoteArrayLiteral = (text: string, protectedRanges: ProtectedRange[]): string | null => {
  const parts = parseAssignmentWord(text);

  if (!parts?.list) {
    return null;
  }

  const elements: string[] = [];
  let offset = parts.valueStart;

  for (const element of parts.value.split(ARRAY_ELEMENT_SEPARATOR)) {
    // Runs of blanks, and blanks just inside the parens, leave empty pieces that
    // are not elements. An element written as '' or "" is not empty here yet, so
    // dropping them now is what keeps the two apart afterwards.
    if (element !== '') {
      const ranges = sliceRanges(protectedRanges, offset, offset + element.length);

      elements.push(ranges.length > 0 ? unquoteWithProtectedRanges(element, ranges) : unquote(element));
    }

    offset += element.length + ARRAY_ELEMENT_SEPARATOR.length;
  }

  return `${text.slice(0, parts.valueStart)}${elements.join(ARRAY_ELEMENT_SEPARATOR)})`;
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
        // Also for a WORD, so `declare -a x=(1 2)` reaches the builtin intact
        const literal = unquoteArrayLiteral(token.value!, token.protectedRanges ?? []);

        if (literal !== null) {
          return token.setValue(literal);
        }

        if (token.protectedRanges && token.protectedRanges.length > 0) {
          return token.setValue(unquoteWithProtectedRanges(token.value!, token.protectedRanges));
        }
        return token.setValue(unquote(token.value!));
      }
    }

    return token;
  });

export default quoteRemoval;
