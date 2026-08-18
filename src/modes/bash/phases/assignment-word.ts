import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import { isAssignmentPrefix } from '../../../utils/assignment.ts';
import map from '../../../utils/iterable/map.ts';

const assignmentWord: LexerPhase = () => {
  let commandPrefixNotAllowed = false;

  return map(async (tk: TokenIf) => {
    // apply only on valid positions
    // (start of simple commands)
    if (tk.ctx.maybeStartOfSimpleCommand) {
      commandPrefixNotAllowed = false;
    }

    // check if it is an assignment: a name, optionally subscripted, optionally
    // appending — `x=1`, `x+=1`, `x[2]=1`, `x[2]+=1`, `x=(1 2)`
    if (!commandPrefixNotAllowed && tk.is('WORD') && isAssignmentPrefix(tk.value!)) {
      return tk.setType('ASSIGNMENT_WORD');
    }

    commandPrefixNotAllowed = true;
    return tk;
  });
};

export default assignmentWord;
