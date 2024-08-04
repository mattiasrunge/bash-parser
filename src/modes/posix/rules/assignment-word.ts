import map from 'map-iterable';
import type { LexerPhase, TokenIf } from '~/types.ts';
import isValidName from '~/utils/is-valid-name.ts';

const assignmentWord: LexerPhase = () =>
  map((tk: TokenIf, idx, ctx) => {
    // apply only on valid positions
    // (start of simple commands)
    if (tk._.maybeStartOfSimpleCommand) {
      ctx.commandPrefixNotAllowed = false;
    }

    // check if it is an assignment
    if (
      !ctx.commandPrefixNotAllowed && tk.is('WORD') && tk.value!.indexOf('=') > 0 && (
        // left part must be a valid name
        isValidName(tk.value!.slice(0, tk.value!.indexOf('=')))
      )
    ) {
      return tk.changeTokenType('ASSIGNMENT_WORD', tk.value!);
    }

    ctx.commandPrefixNotAllowed = true;
    return tk;
  });

export default assignmentWord;
