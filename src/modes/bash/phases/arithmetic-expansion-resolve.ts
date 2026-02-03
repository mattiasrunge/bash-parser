import type { LexerPhase } from '~/lexer/types.ts';
import type { TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';
import { ReplaceString } from '~/utils/replace-string.ts';
import fieldSplittingMark from './lib/field-splitting-mark.ts';

const arithmeticExpansionResolve: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (ctx.resolvers.runArithmeticExpression && token.expansion) {
      const rValue = new ReplaceString(token.value!);

      for (const xp of token.expansion) {
        if (xp.type === 'ArithmeticExpansion') {
          const result = await ctx.resolvers.runArithmeticExpression(xp.expression!, xp.arithmeticAST!);
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

export default arithmeticExpansionResolve;
