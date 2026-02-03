import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const ioNumber: LexerPhase = (ctx) => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      const next = it.ahead(1);

      if (tk && tk.is('WORD') && tk.value!.match(/^[0-9]+$/) && ctx.enums.IOFileOperators.some((op) => next!.type === op)) {
        return tk.setType('IO_NUMBER');
      }

      return tk;
    }),
    lookahead,
  );
};

export default ioNumber;
