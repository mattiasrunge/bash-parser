import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';

/**
 * ANSI-C quoting, `$'a\nb'`.
 *
 * The text is taken verbatim here, `$'` and all: the escapes are decoded during
 * quote removal instead. One source character has to stay one token character,
 * or the recorded offsets of any expansion later in the same word would no
 * longer point at it.
 */
const dollarSingleQuoting: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    return {
      nextReduction: null,
      tokensToEmit: [
        ...state.tokenOrEmpty(),
        mkToken(
          'CONTINUE',
          "$'",
          state.delimiterStartLoc
            ? {
              loc: {
                start: { ...state.delimiterStartLoc },
                end: { ...state.delimiterStartLoc },
              },
            }
            : undefined,
        ),
      ],
      nextState: state,
    };
  }

  if (state.escaping) {
    return {
      nextReduction: reducers.dollarSingleQuoting,
      nextState: state.setEscaping(false).appendChar(char),
    };
  }

  if (char === '\\') {
    return {
      nextReduction: reducers.dollarSingleQuoting,
      nextState: state.setEscaping(true).appendChar(char),
    };
  }

  if (char === "'") {
    return {
      nextReduction: state.previousReducer,
      nextState: state.appendChar(char),
    };
  }

  return {
    nextReduction: reducers.dollarSingleQuoting,
    nextState: state.appendChar(char),
  };
};

export default dollarSingleQuoting;
