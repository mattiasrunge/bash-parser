import type { LexerPhase } from '~/lexer/types.ts';
import type { TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';
import { ReplaceString } from '~/utils/replace-string.ts';
import fieldSplittingMark from './lib/field-splitting-mark.ts';

const commandExpansionResolve: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (ctx.resolvers.execCommand && token.expansion) {
      const rValue = new ReplaceString(token.value!);

      for (const xp of token.expansion) {
        if (xp.type === 'CommandExpansion') {
          const result = await ctx.resolvers.execCommand(xp.command!, xp.commandAST!);
          const replacement = await fieldSplittingMark(result.replace(/\n+$/, ''), token.value!, ctx.resolvers.resolveEnv);

          rValue.replace(
            xp.loc!.start,
            xp.loc!.end + 1,
            replacement,
          );
          xp.resolved = true;
        }
      }
      return token.alterValueWithRanges(rValue.text, rValue.protectedRanges);
    }
    return token;
  });

export default commandExpansionResolve;
