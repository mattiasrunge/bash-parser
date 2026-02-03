import type { LexerPhase } from '../../../lexer/types.ts';
import { applyVisitor, mkToken, type TokenIf, type Visitor } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';
import filterNonNull from '../../../utils/non-null.ts';

const ReplaceWithLineBreakIn: Visitor = {
  async NEWLINE_LIST(tk: TokenIf, iterable?: AsyncIterable<TokenIf>) {
    const it = iterable as LookaheadIterable<TokenIf>;
    const nextToken = it.ahead(1) || mkToken('EMPTY');

    if (nextToken.is('In')) {
      return tk.setType('LINEBREAK_IN').setValue('\nin');
    }

    return tk;
  },

  async In(tk: TokenIf, iterable?: AsyncIterable<TokenIf>) {
    const it = iterable as LookaheadIterable<TokenIf>;
    const lastToken = it.behind(1) || mkToken('EMPTY');

    if (lastToken.is('NEWLINE_LIST')) {
      return null;
    }

    return tk;
  },
};

/* resolve a conflict in grammar by tokenize linebreak+in
tokens as a new  linebreak_in */
const linebreakIn: LexerPhase = () =>
  compose<TokenIf>(
    filterNonNull,
    map(
      applyVisitor(ReplaceWithLineBreakIn),
    ),
    lookahead,
  );

export default linebreakIn;
