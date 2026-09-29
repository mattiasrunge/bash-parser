import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR, isAssignmentPrefix } from '../../../utils/assignment.ts';

/** `a=`, `a+=`, `a[0]=` — what has to precede a `(` for it to open an array literal */
const opensArrayLiteral = (current: string) => isAssignmentPrefix(current) && current.endsWith('=');

/**
 * The subscript of an assignment, `a[hello world]=x`, when it holds blanks:
 * bash reads it to the matching `]` as part of the word, so it is one word and
 * not `a[hello` and `world]=x`. Given what follows the `[`; undefined unless
 * the `]` is followed by `=` or `+=` on the same line — or the `[` starts an
 * element of an array literal, `h=([foo bar]=x)`, which bash reads the same way.
 */
function blankSubscript(source: string[], element = false): string | undefined {
  let depth = 1;
  let quote = '';

  for (let i = 0; i < source.length; i++) {
    const c = source[i];

    if (c === '\n') return undefined;

    if (quote) {
      if (c === quote) quote = '';
      else if (c === '\\' && quote === '"') i++;
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (c === '\\') {
      i++;
    } else if (c === '[') {
      depth++;
    } else if (c === ']' && --depth === 0) {
      const inner = source.slice(0, i).join('');
      const assigns = element || source[i + 1] === '=' || (source[i + 1] === '+' && source[i + 2] === '=');

      return assigns && /\s/.test(inner) ? inner : undefined;
    }
  }

  return undefined;
}

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
  // An extended pattern is part of its word, parentheses, bars and all:
  // `echo *.@(c|h)`, `echo a*!(x)`. Bash reads these only with extglob on;
  // without it they could not parse at all, so they are always read.
  // Only what would end the word is taken here; quotes and expansions inside
  // the pattern are read as anywhere else.
  if (!state.escaping && state.extglobDepth > 0 && (/[()|&;<>]/.test(char) || /\s/.test(char))) {
    const depth = char === '(' ? state.extglobDepth + 1 : char === ')' ? state.extglobDepth - 1 : state.extglobDepth;

    return {
      nextReduction: reducers.start,
      nextState: state.appendChar(char).setExtglobDepth(depth),
    };
  }

  if (!state.escaping && !state.arrayAssignment && char === '[' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(state.current)) {
    const subscript = blankSubscript(source);

    if (subscript !== undefined) {
      let next = state.appendChar(char);

      for (const c of source.splice(0, subscript.length + 1)) next = next.appendChar(c).advanceLoc(c);

      return { nextReduction: reducers.start, nextState: next };
    }
  }

  if (!state.escaping && !state.arrayAssignment && char === '(' && /[?*+@!]$/.test(state.current) && !opensArrayLiteral(state.current)) {
    return {
      nextReduction: reducers.start,
      nextState: state.appendChar(char).setExtglobDepth(1),
    };
  }

  if (!state.escaping && !state.arrayAssignment && char === '(' && opensArrayLiteral(state.current)) {
    return {
      nextReduction: reducers.start,
      nextState: state.appendChar(char).setArrayAssignment(true),
    };
  }

  if (!state.escaping && state.arrayAssignment) {
    // `[foo bar]=x` starting an element is one element
    if (char === '[' && (state.current.endsWith(ARRAY_ELEMENT_SEPARATOR) || state.current.endsWith('('))) {
      const subscript = blankSubscript(source, true);

      if (subscript !== undefined) {
        let next = state.appendChar(char);

        for (const c of source.splice(0, subscript.length + 1)) next = next.appendChar(c).advanceLoc(c);

        return { nextReduction: reducers.start, nextState: next };
      }
    }

    // A comment where an element could start runs to the end of the line
    if (char === '#' && (state.current.endsWith(ARRAY_ELEMENT_SEPARATOR) || state.current.endsWith('('))) {
      return {
        nextReduction: reducers.arrayComment,
        nextState: state,
      };
    }

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
      // Two characters taken in one step: the location moves past the `(` here,
      // and past the `<` as for any step, or everything after sits one early
      nextState: state
        .appendEmptyExpansion()
        .replaceLastExpansion({ direction: char === '<' ? 'in' : 'out' })
        .appendChar(char)
        .appendChar('(')
        .advanceLoc('('),
    };
  }

  if (!state.escaping && state.isPartOfOperator(char)) {
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
