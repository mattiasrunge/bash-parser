export type GlobPattern = {
  pattern: string;
  start: number;
  end: number;
};

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';

/**
 * Checks if a text contains unquoted glob characters.
 * Glob chars inside single or double quotes, or escaped, are not counted.
 * A standalone '[' without a matching ']' is NOT considered a glob.
 */
export function hasUnquotedGlob(text: string): boolean {
  let currentQuote: string | null = null;
  let isEscaped = false;
  let inBracket = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (c === BACKSLASH && currentQuote !== SINGLE_QUOTE) {
      isEscaped = true;
      continue;
    }

    if (!currentQuote && (c === DOUBLE_QUOTE || c === SINGLE_QUOTE)) {
      currentQuote = c;
      continue;
    }

    if (currentQuote && c === currentQuote) {
      currentQuote = null;
      continue;
    }

    if (!currentQuote) {
      // * and ? are always glob chars
      if (c === '*' || c === '?') {
        return true;
      }
      // [ starts a potential bracket expression
      if (c === '[') {
        inBracket = true;
      }
      // ] completes a bracket expression - this is a glob
      if (c === ']' && inBracket) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Scans a token value and returns all unquoted glob patterns with their locations.
 *
 * Rules:
 * - Globs inside single quotes ('...') are NOT tracked
 * - Globs inside double quotes ("...") are NOT tracked
 * - Escaped glob chars (\*, \?, \[) are NOT tracked
 * - Only unquoted glob patterns are returned
 * - Patterns are contiguous unquoted segments containing glob characters
 */
export function scanGlobPatterns(text: string): GlobPattern[] {
  const patterns: GlobPattern[] = [];

  let currentQuote: string | null = null;
  let isEscaped = false;

  // Track current unquoted segment
  let segmentStart: number | null = null;
  let segmentHasGlob = false;
  let inBracket = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (c === BACKSLASH && currentQuote !== SINGLE_QUOTE) {
      isEscaped = true;
      continue;
    }

    // Handle quote transitions
    if (!currentQuote && (c === DOUBLE_QUOTE || c === SINGLE_QUOTE)) {
      // Entering quoted section - end current unquoted segment
      if (segmentStart !== null && segmentHasGlob) {
        patterns.push({
          pattern: text.slice(segmentStart, i),
          start: segmentStart,
          end: i,
        });
      }
      segmentStart = null;
      segmentHasGlob = false;
      inBracket = false;
      currentQuote = c;
      continue;
    }

    if (currentQuote && c === currentQuote) {
      // Exiting quoted section
      currentQuote = null;
      continue;
    }

    // Only process unquoted characters
    if (!currentQuote) {
      // Start new segment if not already in one
      if (segmentStart === null) {
        segmentStart = i;
      }

      // Track bracket expressions
      // A standalone '[' without matching ']' is NOT a glob
      if (c === '[' && !inBracket) {
        inBracket = true;
        // Don't set segmentHasGlob yet - wait for closing ']'
      } else if (c === ']' && inBracket) {
        inBracket = false;
        segmentHasGlob = true; // Bracket expression complete - this is a glob
      } else if ((c === '*' || c === '?') && !inBracket) {
        segmentHasGlob = true;
      }
    }
  }

  // Handle trailing unquoted segment
  // Only include if we have complete globs (not unclosed brackets)
  if (segmentStart !== null && segmentHasGlob && !inBracket) {
    patterns.push({
      pattern: text.slice(segmentStart, text.length),
      start: segmentStart,
      end: text.length,
    });
  }

  return patterns;
}
