import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import isValidName from '../../../utils/is-valid-name.ts';
import compose from '../../../utils/iterable/compose.ts';
import lookahead, { type LookaheadIterable } from '../../../utils/iterable/lookahead.ts';
import map from '../../../utils/iterable/map.ts';

const couldEndSimpleCommand = (scTk: TokenIf) => {
  return scTk && (
    scTk.is('SEPARATOR_OP') ||
    scTk.is('NEWLINE') ||
    scTk.is('NEWLINE_LIST') ||
    scTk.value === ';' ||
    scTk.is('PIPE') ||
    scTk.is('OR_IF') ||
    scTk.is('PIPE') ||
    scTk.is('AND_IF')
  );
};

const couldBeCommandName = (tk: TokenIf) => {
  return tk && tk.is('WORD') && isValidName(tk.value!);
};

const identifySimpleCommandNames: LexerPhase = (ctx) =>
  compose<TokenIf>(
    map(async (tk: TokenIf, _idx, iterable) => {
      const it = iterable as LookaheadIterable<TokenIf>;
      if (tk.ctx?.maybeStartOfSimpleCommand) {
        if (couldBeCommandName(tk)) {
          tk.ctx.maybeSimpleCommandName = true;
        } else {
          const next = it.ahead(1);
          if (next && !couldEndSimpleCommand(next)) {
            next.ctx!.commandNameNotFoundYet = true;
          }
        }
      }

      if (tk.ctx?.commandNameNotFoundYet) {
        const last = it.behind(1);

        if (!ctx.enums.IOFileOperators.some((op) => last!.type === op) && couldBeCommandName(tk)) {
          tk.ctx.maybeSimpleCommandName = true;
        } else {
          const next = it.ahead(1);
          if (next && !couldEndSimpleCommand(next)) {
            next.ctx!.commandNameNotFoundYet = true;
          }
        }
        delete tk.ctx.commandNameNotFoundYet;
      }

      return tk;
    }),
    lookahead,
  );

export default identifySimpleCommandNames;
