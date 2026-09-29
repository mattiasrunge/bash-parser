import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

/**
 * An IO_NUMBER is "a string of digits delimited by '<' or '>' with no
 * intervening blank" (POSIX 2.10.1). The blank is the whole point: `2>file`
 * redirects fd 2, while `seq 2 >file` passes 2 to seq and redirects stdout.
 *
 * Without the adjacency check any digits-only word before a redirect became an
 * fd number, so the argument was consumed and never reached the command —
 * `seq 20 > /f` failed with "seq: missing operand" and `tail -n 20 > /f`
 * silently fell back to the default 10 lines.
 *
 * `loc.end` is inclusive, so adjacent tokens satisfy `end.char + 1 === start.char`.
 * When either location is missing there is nothing to compare, and the old
 * unconditional promotion is kept so a plain `2>&1` cannot regress.
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

const ioNumber: LexerPhase = (ctx) => {
  return compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      const next = it.ahead(1);

      if (
        tk && tk.is('WORD') && (/^[0-9]+$/.test(tk.value!) || NAMED_DESCRIPTOR.test(tk.value!)) && next &&
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
