import type { LexerPhase } from '../../../lexer/types.ts';
import { mkToken, type TokenIf } from '../../../tokenizer/mod.ts';
import map from '../../../utils/iterable/map.ts';

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

      // We're in subshell context(s) - split into two CLOSE_PAREN tokens, each
      // with its own place: the second starts a character after the first
      contextStack.pop();
      contextStack.pop();

      const loc = token.loc;
      const next = loc && { ...loc.start, col: loc.start.col! + 1, char: loc.start.char! + 1 };

      return [
        mkToken('CLOSE_PAREN', ')', { loc: loc && { start: loc.start, end: loc.start } }),
        mkToken('CLOSE_PAREN', ')', { loc: loc && { start: next!, end: loc.end } }),
      ];
    }

    return token;
  });
};

export default parenContext;
