import type { LexerPhase } from '~/lexer/types.ts';
import type { Expansion, TokenIf } from '~/tokenizer/mod.ts';
import type { GlobPattern } from '~/utils/glob-pattern-scanner.ts';
import { hasUnquotedGlob, scanGlobPatterns } from '~/utils/glob-pattern-scanner.ts';
import map from '~/utils/iterable/map.ts';

/**
 * Check if a glob pattern overlaps with any existing expansion.
 * We exclude globs that are inside parameter/command/arithmetic expansions.
 */
const overlapsWithExpansion = (glob: GlobPattern, expansions: Expansion[]): boolean => {
  for (const xp of expansions) {
    if (!xp.loc) continue;
    // Check if glob is entirely inside or overlaps with existing expansion
    if (glob.start >= xp.loc.start && glob.start < xp.loc.end) {
      return true;
    }
    if (glob.end > xp.loc.start && glob.end <= xp.loc.end) {
      return true;
    }
    // Check if existing expansion is inside glob
    if (xp.loc.start >= glob.start && xp.loc.end <= glob.end) {
      return true;
    }
  }
  return false;
};

/**
 * Detects glob patterns (pathname expansion) in unquoted sections of WORD tokens
 * and adds them as PathExpansion entries to the token's expansion array.
 *
 * This phase tracks patterns for later resolution - it does NOT resolve them.
 */
const pathExpansionDetect: LexerPhase = () =>
  map(async (token: TokenIf) => {
    if (token.is('WORD')) {
      const text = token.value!;

      // Quick check first
      if (!hasUnquotedGlob(text)) {
        return token;
      }

      // Scan for glob patterns with locations
      const globPatterns = scanGlobPatterns(text);

      if (globPatterns.length === 0) {
        return token;
      }

      const existingExpansions = token.expansion || [];

      // Filter out globs that overlap with existing expansions
      const filteredPatterns = globPatterns.filter((g) => !overlapsWithExpansion(g, existingExpansions));

      if (filteredPatterns.length === 0) {
        return token;
      }

      // Create PathExpansion entries
      const pathExpansions: Expansion[] = filteredPatterns.map((g) => ({
        type: 'PathExpansion' as const,
        pattern: g.pattern,
        resolved: false,
        loc: {
          start: g.start,
          end: g.end,
        },
      }));

      // Merge and sort by location
      const allExpansions = [...existingExpansions, ...pathExpansions].sort(
        (a, b) => (a.loc?.start ?? 0) - (b.loc?.start ?? 0),
      );

      return token.setExpansion(allExpansions);
    }

    if (token.is('ASSIGNMENT_WORD')) {
      const text = token.value!;
      const eqIndex = text.indexOf('=');

      if (eqIndex === -1) {
        return token;
      }

      // Only scan the value part (after '=')
      const valuePart = text.slice(eqIndex + 1);

      if (!hasUnquotedGlob(valuePart)) {
        return token;
      }

      const globPatterns = scanGlobPatterns(valuePart);

      if (globPatterns.length === 0) {
        return token;
      }

      // Adjust locations to account for the name= prefix
      const offset = eqIndex + 1;
      const existingExpansions = token.expansion || [];

      // Filter out globs that overlap with existing expansions (accounting for offset)
      const filteredPatterns = globPatterns.filter((g) => {
        const adjustedGlob = { ...g, start: g.start + offset, end: g.end + offset };
        return !overlapsWithExpansion(adjustedGlob, existingExpansions);
      });

      if (filteredPatterns.length === 0) {
        return token;
      }

      const pathExpansions: Expansion[] = filteredPatterns.map((g) => ({
        type: 'PathExpansion' as const,
        pattern: g.pattern,
        resolved: false,
        loc: {
          start: g.start + offset,
          end: g.end + offset,
        },
      }));

      const allExpansions = [...existingExpansions, ...pathExpansions].sort(
        (a, b) => (a.loc?.start ?? 0) - (b.loc?.start ?? 0),
      );

      return token.setExpansion(allExpansions);
    }

    return token;
  });

export default pathExpansionDetect;
