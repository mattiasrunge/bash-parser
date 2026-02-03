import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import isValidName from '../../../utils/is-valid-name.ts';
import map from '../../../utils/iterable/map.ts';

const assignmentWord: LexerPhase = () => {
  let commandPrefixNotAllowed = false;

  return map(async (tk: TokenIf) => {
    // apply only on valid positions
    // (start of simple commands)
    if (tk.ctx.maybeStartOfSimpleCommand) {
      commandPrefixNotAllowed = false;
    }

    // check if it is an assignment
    if (
      !commandPrefixNotAllowed && tk.is('WORD') && tk.value!.indexOf('=') > 0 && (
        // left part must be a valid name
        isValidName(tk.value!.slice(0, tk.value!.indexOf('=')))
      )
    ) {
      return tk.setType('ASSIGNMENT_WORD');
    }

    commandPrefixNotAllowed = true;
    return tk;
  });
};

export default assignmentWord;
