import type { Reducer } from '../../../tokenizer/types.ts';

/**
 * Whether the text after `((` closes as an arithmetic command: a `))` with every `(` between them
 * closed. A lone `)` first means the `((` opened two subshells, `((cd a); ls)`, and it is left to be
 * read that way.
 */
export const closesArithmetic = (source: string[]): boolean => {
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '(') depth++;
    else if (char === ')') {
      if (depth > 0) depth--;
      else return source[i + 1] === ')';
    }
  }
  return false;
};

/** How many of the `(` in `text` are still open. */
const openParens = (text: string): number => {
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
  }
  return depth;
};

/**
 * The body of `(( … ))`, read as one word up to its closing `))`. It is arithmetic, not shell:
 * `<`, `>`, `&&`, `|` and `;` are operators of the expression, so the shell's operators must not
 * split it — `(( i < 3 ))` and `for (( i = 0; i < 3; i++ ))` are one expression each (the second
 * three, which the grammar splits at its top-level `;`). Entered from `operator` once `((` is
 * read and `closesArithmetic` has found its end.
 */
const arithmeticCommand: Reducer = (state, source, reducers) => {
  const char = source.shift();

  if (char === undefined) {
    return { nextReduction: reducers.end, tokensToEmit: state.tokenOrEmpty(), nextState: state.resetCurrent() };
  }

  // Leading blanks are not part of the expression; the location's start moves past them by itself.
  if (state.current === '' && /\s/.test(char)) {
    return { nextReduction: arithmeticCommand, nextState: state };
  }

  if (char === ')' && openParens(state.current) === 0) {
    while (/\s$/.test(state.current)) state = state.removeLastChar();
    // The `)` starts the closing `))`, which `operator` finishes and emits.
    return {
      nextReduction: reducers.operator,
      tokensToEmit: state.tokenOrEmpty(),
      nextState: state.setCurrent(char).saveCurrentLocAsStart(),
    };
  }

  return { nextReduction: arithmeticCommand, nextState: state.appendChar(char) };
};

export default arithmeticCommand;
