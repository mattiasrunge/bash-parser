import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const isValidReservedWordPosition = (tk: TokenIf, iterable: LookaheadIterable<TokenIf>, words: Record<string, string>, lastWasReserved: boolean) => {
  const last = iterable.behind(1) || { EMPTY: true, is: (type: string) => type === 'EMPTY', value: '' };
  const twoAgo = iterable.behind(2) || { EMPTY: true, is: (type: string) => type === 'EMPTY', value: '' };

  // evaluate based on last token
  const startOfCommand = last.is('EMPTY') || last.is('SEPARATOR_OP') || last.is('OPEN_PAREN') ||
    last.is('CLOSE_PAREN') || last.is('NEWLINE') || last.is('NEWLINE_LIST') ||
    last.is('DSEMI') || last.is('SEMI_AND') || last.is('DSEMI_AND') || last.value === ';' || last.is('PIPE') || last.is('PIPE_AND') ||
    last.is('OR_IF') || last.is('PIPE') || last.is('PIPE_AND') || last.is('AND_IF');

  // What the last token became, not what it reads: in `t ! !` the first `!` is an argument
  const lastIsReservedWord = !(last.value === 'for') && !(last.value === 'select') && !(last.value === 'in') && !(last.value === 'case') &&
    (Object.values(words).some((word) => last.is(word)) || lastWasReserved);

  const thirdInCase = twoAgo.value === 'case' && tk.is('TOKEN') && tk.value!.toLowerCase() === 'in';
  const thirdInFor = (twoAgo.value === 'for' || twoAgo.value === 'select') && tk.is('TOKEN') &&
    (tk.value!.toLowerCase() === 'in' || tk.value!.toLowerCase() === 'do');

  // `function name { … }`: the body's `{` follows the name directly
  const braceAfterFunction = tk.value === '{' && twoAgo.value === 'function';

  // `if [[ x ]] then`: `]]` ends the command, and bash needs no separator after it either
  const afterConditional = last.is('DOUBLE_CLOSE_BRACKET');

  // `for (( … )) do`: bash needs no separator between the arithmetic header and `do`.
  // …and none after `((…))` either: `if ((x)) then`, `for ((…)) {`
  const doAfterArithmetic = last.value === '))' && tk.is('TOKEN');

  // console.log({tk, startOfCommand, lastIsReservedWord, thirdInFor, thirdInCase, twoAgo})
  // `}` too closes a group only where a command could start: `echo }` is an argument
  return startOfCommand || lastIsReservedWord || thirdInFor || thirdInCase || doAfterArithmetic || afterConditional || braceAfterFunction;
};

const reservedWords: LexerPhase = (ctx) => {
  let lastWasReserved = false;

  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const valid = isValidReservedWordPosition(tk, iterable as LookaheadIterable<TokenIf>, ctx.enums.reservedWords, lastWasReserved);

      lastWasReserved = false;

      // TOKEN tokens consisting of a reserved word
      // are converted to their own token types
      if (tk.is('TOKEN') && valid && tk.value! in ctx.enums.reservedWords) {
        lastWasReserved = true;
        return tk.setType(ctx.enums.reservedWords[tk.value!]);
      }

      // otherwise, TOKEN tokens are converted to
      // WORD tokens
      if (tk.is('TOKEN')) {
        return tk.setType('WORD');
      }

      // other tokens are amitted as-is
      return tk;
    }),
    lookahead.depth(2),
  );
};

export default reservedWords;
