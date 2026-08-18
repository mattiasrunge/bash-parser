import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR, isAssignmentPrefix } from '../../../utils/assignment.ts';

/** `a=`, `a+=`, `a[0]=` — what has to precede a `(` for it to open an array literal */
const opensArrayLiteral = (current: string) => isAssignmentPrefix(current) && current.endsWith('=');

const start: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    if (state.arrayAssignment) {
      // `a=(x` with no closing paren: ask for the rest instead of assigning `(x`
      return {
        nextReduction: reducers.end,
        tokensToEmit: [mkToken('CONTINUE', '(')],
        nextState: state.resetCurrent().saveCurrentLocAsStart().setArrayAssignment(false),
      };
    }

    return {
      nextReduction: reducers.end,
      tokensToEmit: state.tokenOrEmpty(),
      nextState: state.resetCurrent().saveCurrentLocAsStart(),
    };
  }

  if (state.escaping && char === '\n') {
    return {
      nextReduction: reducers.start,
      nextState: state.setEscaping(false).removeLastChar(),
    };
  }

  // An array literal is one word: `(` after an assignment prefix opens it, and
  // until the matching `)` neither blanks nor operators end the word. Blanks
  // become element separators, everything else (quotes, expansions) is reduced
  // by the ordinary rules below.
  if (!state.escaping && !state.arrayAssignment && char === '(' && opensArrayLiteral(state.current)) {
    return {
      nextReduction: reducers.start,
      nextState: state.appendChar(char).setArrayAssignment(true),
    };
  }

  if (!state.escaping && state.arrayAssignment) {
    if (char === ')') {
      return {
        nextReduction: reducers.start,
        nextState: state.appendChar(char).setArrayAssignment(false),
      };
    }

    if (char.match(/\s/)) {
      return {
        nextReduction: reducers.start,
        nextState: state.appendChar(ARRAY_ELEMENT_SEPARATOR),
      };
    }
  }

  if (!state.escaping && char === '#' && state.current === '') {
    return {
      nextReduction: reducers.comment,
    };
  }

  if (!state.escaping && char === '\n') {
    return {
      nextReduction: reducers.start,
      tokensToEmit: state.tokenOrEmpty().concat(mkToken('NEWLINE', '\n')),
      nextState: state.resetCurrent().saveCurrentLocAsStart(),
    };
  }

  if (!state.escaping && char === '\\') {
    return {
      nextReduction: reducers.start,
      nextState: state.setEscaping(true).appendChar(char),
    };
  }

  // Process substitution, `<(cmd)` / `>(cmd)`: a word, not a redirection, and
  // the body is reduced by the command substitution machinery
  if (!state.escaping && (char === '<' || char === '>') && source[0] === '(') {
    source.shift();

    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state
        .appendEmptyExpansion()
        .replaceLastExpansion({ direction: char === '<' ? 'in' : 'out' })
        .appendChar(char)
        .appendChar('('),
    };
  }

  if (!state.escaping && state.isPartOfOperator(char)) {
    // Special case: '[' and ']' are only potential operators at word boundary.
    // In the middle of a word (like file[0-9].txt), they are glob characters.
    // '[[' and ']]' are operators, but '[' and ']' alone are not, so we only
    // enter operator mode for these when we're starting a new token.
    if ((char === '[' || char === ']') && state.current !== '') {
      return {
        nextReduction: reducers.start,
        nextState: state.appendChar(char).setEscaping(false),
      };
    }
    return {
      nextReduction: reducers.operator,
      tokensToEmit: state.tokenOrEmpty(),
      nextState: state.setCurrent(char).saveCurrentLocAsStart(),
    };
  }

  if (!state.escaping && char === "'") {
    return {
      nextReduction: reducers.singleQuoting,
      nextState: state.saveDelimiterStart().appendChar(char),
    };
  }

  if (!state.escaping && char === '"') {
    return {
      nextReduction: reducers.doubleQuoting,
      nextState: state.saveDelimiterStart().appendChar(char),
    };
  }

  if (!state.escaping && char.match(/\s/)) {
    return {
      nextReduction: reducers.start,
      tokensToEmit: state.tokenOrEmpty(),
      nextState: state.resetCurrent().saveCurrentLocAsStart().setExpansion([]),
    };
  }

  if (!state.escaping && char === '$') {
    return {
      nextReduction: reducers.expansionStart,
      nextState: state.appendChar(char).appendEmptyExpansion(),
    };
  }

  if (!state.escaping && char === '`') {
    return {
      nextReduction: reducers.expansionCommandTick,
      nextState: state.appendChar(char).appendEmptyExpansion(),
    };
  }

  return {
    nextReduction: reducers.start,
    nextState: state.appendChar(char).setEscaping(false),
  };
};

export default start;
