import { parseArithmetic } from '~/arithmetic/mod.ts';
import type { LexerPhase } from '~/lexer/types.ts';
import type { Expansion, TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

function parseArithmeticAST(xp: Expansion) {
  try {
    return parseArithmetic(xp.expression!);
  } catch (err) {
    throw new SyntaxError(`Cannot parse arithmetic expression "${xp.expression}": ${(err as Error).message}`);
  }
}

const arithmeticExpansion: LexerPhase = () =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!token.expansion || token.expansion.length === 0) {
        return token;
      }

      return token.setExpansion(
        token.expansion.map((xp: Expansion) => {
          if (xp.type === 'ArithmeticExpansion') {
            return Object.assign({}, xp, { arithmeticAST: parseArithmeticAST(xp) });
          }
          return xp;
        }),
      );
    }
    return token;
  });

export default arithmeticExpansion;
