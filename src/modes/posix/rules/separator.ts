import type { LexerPhase, TokenIf } from '~/types.ts';
import compose from '~/utils/compose.ts';
import lookahead, { type LookaheadIterable } from '~/utils/iterable/lookahead.ts';
import map from '~/utils/iterable/map.ts';
import filterNonNull from '~/utils/non-null.ts';
import tokens from '~/utils/tokens.ts';

const isSeparator = (tk: TokenIf) =>
  tk && (
    tk.is('NEWLINE') ||
    tk.is('NEWLINE_LIST') ||
    tk.is('AND') ||
    tk.is('SEMICOLON') ||
    (tk.is('OPERATOR') && tk.value === ';') ||
    (tk.is('OPERATOR') && tk.value === '&')
  );

const skipJoined = (tk: TokenIf) => {
  if (tk._.joinedToSeparator) {
    return null;
  }
  return tk;
};

const toSeparatorToken = (tk: TokenIf, iterable: LookaheadIterable<TokenIf>) => {
  if (skipJoined(tk) === null) {
    return null;
  }

  let newTk = tokens.changeTokenType(
    tk,
    'SEPARATOR_OP',
    tk.value!,
  );

  let i = 1;
  let nextTk = iterable.ahead(i);
  while (isSeparator(nextTk!)) {
    nextTk!._.joinedToSeparator = true;
    i++;
    newTk = newTk.appendTo(nextTk!.value!);

    nextTk = iterable.ahead(i);
  }
  return newTk;
};

const AccumulateSeparators = {
  NEWLINE: skipJoined,
  NEWLINE_LIST: skipJoined,
  SEMICOLON: toSeparatorToken,
  AND: toSeparatorToken,
  OPERATOR: (tk: TokenIf, iterable: LookaheadIterable<TokenIf>) => tk.value === '&' || tk.value === ';' ? toSeparatorToken(tk, iterable) : tk,
};

/*
resolve a conflict in grammar by
tokenize the former rule:

separator_op     : '&'
         | ';'
         ;
separator       : separator_op
         | separator_op NEWLINE_LIST
         | NEWLINE_LIST

with a new separator_op token, the rule became:

separator : separator_op
         | NEWLINE_LIST
*/
const separator: LexerPhase = () =>
  compose<TokenIf>(
    filterNonNull,
    map(
      tokens.applyTokenizerVisitor(AccumulateSeparators),
    ),
    lookahead.depth(10),
  );

export default separator;
