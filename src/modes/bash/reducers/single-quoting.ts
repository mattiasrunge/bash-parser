import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';

const singleQuoting: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    return {
      nextState: state,
      nextReduction: null,
      tokensToEmit: [
        ...state.tokenOrEmpty(),
        mkToken(
          'CONTINUE',
          "'",
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
    };
  }

  if (char === "'") {
    return {
      nextReduction: reducers.start,
      nextState: state.appendChar(char),
    };
  }

  return {
    nextReduction: reducers.singleQuoting,
    nextState: state.appendChar(char),
  };
};

export default singleQuoting;
