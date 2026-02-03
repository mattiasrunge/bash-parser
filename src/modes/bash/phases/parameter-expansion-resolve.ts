import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import map from '../../../utils/iterable/map.ts';
import { ReplaceString } from '../../../utils/replace-string.ts';
import fieldSplittingMark from './lib/field-splitting-mark.ts';

const parameterExpansionResolve: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!ctx.resolvers.resolveParameter || !token.expansion || token.expansion.length === 0) {
        return token;
      }

      const rValue = new ReplaceString(token.value!);

      for (const xp of token.expansion) {
        if (xp.type === 'ParameterExpansion') {
          const result = await ctx.resolvers.resolveParameter(xp.parameter!);
          const replacement = await fieldSplittingMark(result, token.value!, ctx.resolvers.resolveEnv);

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

export default parameterExpansionResolve;
