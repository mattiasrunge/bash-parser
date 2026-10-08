import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const functionName: LexerPhase = () => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;

      // `function name`: whatever word follows the keyword is the name
      if ((tk.is('WORD') || tk.is('ASSIGNMENT_WORD')) && it.behind(1)?.is('Function')) {
        return tk.setType('NAME');
      }

      // `name ( )` where a simple command starts is a function's name
      if (
        tk.ctx?.maybeStartOfSimpleCommand &&
        tk.is('WORD') &&
        it.ahead(2) &&
        it.ahead(1)!.is('OPEN_PAREN') &&
        it.ahead(2)!.is('CLOSE_PAREN')
      ) {
        tk = tk.setType('NAME');
      }

      return tk;
    }),
    lookahead.depth(2),
  );
};

export default functionName;
