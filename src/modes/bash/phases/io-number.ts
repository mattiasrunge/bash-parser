import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

/**
 * An IO_NUMBER is "a string of digits delimited by '<' or '>' with no
 * intervening blank" (POSIX 2.10.1): `2>file` redirects fd 2, while
 * `seq 2 >file` passes 2 to seq and redirects stdout.
 *
 * `loc.end` is inclusive, so adjacent tokens satisfy `end.char + 1 === start.char`.
 * When either location is missing there is nothing to compare, and the digits
 * count as adjacent, so that `2>&1` stays a redirection.
 */
const isAdjacent = (tk: TokenIf, next: TokenIf): boolean => {
  const end = tk.loc?.end;
  const start = next.loc?.start;

  if (!end || !start || end.char === undefined || start.char === undefined) {
    return true;
  }

  return end.row === start.row && end.char + 1 === start.char;
};

/** Here-strings and `<<-` take a descriptor as well as the file operators do. */
const HERE_OPERATORS = ['TLESS', 'DLESSDASH'];

/**
 * `{name}` before a redirection is bash's: the shell opens a descriptor of its
 * own choosing, 10 or above, and puts its number in `name` — or, for `{name}>&-`,
 * closes the one `name` holds. The word stands where the number would, as the
 * redirection's IO_NUMBER; the executor tells the two apart.
 */
const NAMED_DESCRIPTOR = /^\{[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\}$/;

/** Digits that are a descriptor: bash's need to fit an int, `1111111111111111111111<f` is a command's name. */
const isDescriptor = (text: string): boolean => /^[0-9]+$/.test(text) && Number(text) <= 2147483647;

const ioNumber: LexerPhase = (ctx) => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      const next = it.ahead(1);

      if (
        tk && tk.is('WORD') && (isDescriptor(tk.value!) || NAMED_DESCRIPTOR.test(tk.value!)) && next &&
        [...ctx.enums.IOFileOperators, ...HERE_OPERATORS].some((op) => next.type === op) &&
        isAdjacent(tk, next)
      ) {
        return tk.setType('IO_NUMBER');
      }

      return tk;
    }),
    lookahead,
  );
};

export default ioNumber;
