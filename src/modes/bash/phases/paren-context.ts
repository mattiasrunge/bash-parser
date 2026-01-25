import type { LexerPhase } from '~/lexer/types.ts';
import { mkToken, type TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

type ParenContext = 'subshell' | 'arithmetic';

const parenContext: LexerPhase = () => {
  const contextStack: ParenContext[] = [];

  return map(async (token: TokenIf) => {
    if (token.is('DOUBLE_OPEN_PAREN')) {
      contextStack.push('arithmetic');
      return token;
    }

    if (token.is('OPEN_PAREN')) {
      contextStack.push('subshell');
      return token;
    }

    if (token.is('CLOSE_PAREN')) {
      contextStack.pop();
      return token;
    }

    if (token.is('DOUBLE_CLOSE_PAREN')) {
      const top = contextStack[contextStack.length - 1];

      if (top === 'arithmetic') {
        contextStack.pop();
        return token;
      }

      // We're in subshell context(s) - split into two CLOSE_PAREN tokens
      contextStack.pop();
      contextStack.pop();
      return [
        mkToken('CLOSE_PAREN', ')', { loc: token.loc }),
        mkToken('CLOSE_PAREN', ')', { loc: token.loc }),
      ];
    }

    return token;
  });
};

export default parenContext;
