import type { LexerPhase } from '~/lexer/types.ts';
import type { TokenIf } from '~/tokenizer/mod.ts';
import compose from '~/utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '~/utils/iterable/lookahead.ts';
import map from '~/utils/iterable/map.ts';

const isValidReservedWordPosition = (tk: TokenIf, iterable: LookaheadIterable<TokenIf>, words: Record<string, string>) => {
  const last = iterable.behind(1) || { EMPTY: true, is: (type: string) => type === 'EMPTY', value: '' };
  const twoAgo = iterable.behind(2) || { EMPTY: true, is: (type: string) => type === 'EMPTY', value: '' };

  // evaluate based on last token
  const startOfCommand = last.is('EMPTY') || last.is('SEPARATOR_OP') || last.is('OPEN_PAREN') ||
    last.is('CLOSE_PAREN') || last.is('NEWLINE') || last.is('NEWLINE_LIST') ||
    last.is('DSEMI') || last.value === ';' || last.is('PIPE') ||
    last.is('OR_IF') || last.is('PIPE') || last.is('AND_IF');

  const lastIsReservedWord = !(last.value === 'for') && !(last.value === 'in') && !(last.value === 'case') &&
    (Object.values(words).some((word) => last.is(word)) || last.value! in words);

  const thirdInCase = twoAgo.value === 'case' && tk.is('TOKEN') && tk.value!.toLowerCase() === 'in';
  const thirdInFor = twoAgo.value === 'for' && tk.is('TOKEN') &&
    (tk.value!.toLowerCase() === 'in' || tk.value!.toLowerCase() === 'do');

  // console.log({tk, startOfCommand, lastIsReservedWord, thirdInFor, thirdInCase, twoAgo})
  return tk.value === '}' || startOfCommand || lastIsReservedWord || thirdInFor || thirdInCase;
};

const reservedWords: LexerPhase = (ctx) =>
  compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      // console.log(tk, isValidReservedWordPosition(tk, iterable), hasOwnProperty(words, tk.value))
      // TOKEN tokens consisting of a reserved word
      // are converted to their own token types
      // console.log({tk, v:isValidReservedWordPosition(tk, iterable)})
      if (isValidReservedWordPosition(tk, iterable as LookaheadIterable<TokenIf>, ctx.enums.reservedWords) && tk.value! in ctx.enums.reservedWords) {
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

export default reservedWords;
