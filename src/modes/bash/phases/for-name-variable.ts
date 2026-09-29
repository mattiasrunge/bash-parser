import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const forNameVariable: LexerPhase = () => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      const lastToken = it.behind(1) || { is: () => false };

      // if last token is For and current token form a valid name
      // type of token is changed from WORD to NAME

      // Any word, valid name or not: bash takes `for 1 in` apart only when it runs
      if ((lastToken.is('For') || lastToken.is('Select')) && tk.is('WORD')) {
        return tk.setType('NAME');
      }

      return tk;
    }),
    lookahead,
  );
};

export default forNameVariable;
