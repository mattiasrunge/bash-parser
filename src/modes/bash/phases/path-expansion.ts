import type { LexerPhase } from '~/lexer/types.ts';
import type { Expansion, TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

const hasPathExpansion = (token: TokenIf): boolean => {
  return token.expansion?.some((xp: Expansion) => xp.type === 'PathExpansion') ?? false;
};

const pathExpansion: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') && typeof ctx.resolvers.resolvePath === 'function') {
      // Only resolve if there's a PathExpansion in the token
      if (!hasPathExpansion(token)) {
        return token;
      }

      const resolved = await ctx.resolvers.resolvePath(token.value!);

      if (Array.isArray(resolved)) {
        if (resolved.length === 0) {
          return token; // No matches - keep original pattern
        }
        return resolved.map((path) => token.setValue(path));
      }

      return token.setValue(resolved);
    }

    if (token.is('ASSIGNMENT_WORD') && typeof ctx.resolvers.resolvePath === 'function') {
      // Only resolve if there's a PathExpansion in the token
      if (!hasPathExpansion(token)) {
        return token;
      }

      const parts = token.value!.split('=');
      const resolved = await ctx.resolvers.resolvePath(parts[1]);

      if (Array.isArray(resolved)) {
        // For assignments, use first match or keep original if no matches
        return token.setValue(parts[0] + '=' + (resolved[0] ?? parts[1]));
      }

      return token.setValue(parts[0] + '=' + resolved);
    }

    return token;
  });

export default pathExpansion;
