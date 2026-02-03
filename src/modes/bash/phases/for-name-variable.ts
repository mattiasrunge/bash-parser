import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import isValidName from '../../../utils/is-valid-name.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const forNameVariable: LexerPhase = () => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      console;
      const lastToken = it.behind(1) || { is: () => false };

      // if last token is For and current token form a valid name
      // type of token is changed from WORD to NAME

      if (lastToken.is('For') && tk.is('WORD') && isValidName(tk.value!)) {
        return tk.setType('NAME');
      }

      return tk;
    }),
    lookahead,
  );
};

export default forNameVariable;
