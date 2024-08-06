import type { LexerPhase, TokenIf } from '~/types.ts';
import compose from '~/utils/compose.ts';
import lookahead, { type LookaheadIterable } from '~/utils/iterable/lookahead.ts';
import map from '~/utils/iterable/map.ts';

const identifyMaybeSimpleCommands: LexerPhase = (_options, mode) => {
  return compose<TokenIf>(
    map((tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      const last = it.behind(1) || { EMPTY: true, is: (type: string) => type === 'EMPTY' };

      // evaluate based on last token
      tk._.maybeStartOfSimpleCommand = Boolean(
        last.is('EMPTY') || last.is('SEPARATOR_OP') || last.is('OPEN_PAREN') ||
          last.is('CLOSE_PAREN') || last.is('NEWLINE') || last.is('NEWLINE_LIST') ||
          last.is('TOKEN') || last.is('PIPE') ||
          last.is('DSEMI') || last.is('OR_IF') || last.is('PIPE') || last.is('AND_IF') ||
          (!last.is('For') && !last.is('In') && !last.is('Case') && Object.values(mode.enums.reservedWords).some((word) => last.is(word))),
      );

      return tk;
    }),
    lookahead,
  );
};

export default identifyMaybeSimpleCommands;
