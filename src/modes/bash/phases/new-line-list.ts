import type { LexerPhase } from '../../../lexer/types.ts';
import { applyVisitor, mkToken, type TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const SkipRepeatedNewLines = {
  async NEWLINE(tk: TokenIf, iterable?: AsyncIterable<TokenIf>) {
    const it = iterable as LookaheadIterable<TokenIf>;
    const lastToken = it.behind(1) || mkToken('EMPTY');

    if (lastToken.is('NEWLINE')) {
      return null;
    }

    return tk.setType('NEWLINE_LIST').setValue('\n');
  },
};

/* resolve a conflict in grammar by tokenize multiple NEWLINEs as a
newline_list token (it was a rule in POSIX grammar) */
const newLineList: LexerPhase = () =>
  compose<TokenIf>(
    // filterNonNull,
    map(
      applyVisitor(SkipRepeatedNewLines),
    ),
    lookahead,
  );

export default newLineList;
