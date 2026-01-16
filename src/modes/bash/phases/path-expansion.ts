import type { LexerPhase } from '~/lexer/types.ts';
import type { TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

const GLOB_CHARS = '*?[';

const hasUnquotedGlobChars = (text: string): boolean => {
  let currentQuote: string | null = null;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (currentQuote) {
      if (c === currentQuote) {
        currentQuote = null;
      }
    } else if (c === '"' || c === "'") {
      currentQuote = c;
    } else if (c === '\\') {
      isEscaped = true;
    } else if (GLOB_CHARS.includes(c)) {
      return true;
    }
  }

  return false;
};

const pathExpansion: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') && typeof ctx.resolvers.resolvePath === 'function') {
      if (hasUnquotedGlobChars(token.value!)) {
        const resolved = await ctx.resolvers.resolvePath(token.value!);

        if (Array.isArray(resolved)) {
          if (resolved.length === 0) {
            return token; // No matches - keep original pattern
          }
          return resolved.map((path) => token.setValue(path));
        }

        return token.setValue(resolved);
      }
    }

    if (token.is('ASSIGNMENT_WORD') && typeof ctx.resolvers.resolvePath === 'function') {
      const parts = token.value!.split('=');
      if (hasUnquotedGlobChars(parts[1])) {
        const resolved = await ctx.resolvers.resolvePath(parts[1]);

        if (Array.isArray(resolved)) {
          // For assignments, use first match or keep original if no matches
          return token.setValue(parts[0] + '=' + (resolved[0] ?? parts[1]));
        }

        return token.setValue(parts[0] + '=' + resolved);
      }
    }

    return token;
  });

export default pathExpansion;
