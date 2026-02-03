import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';

const comment: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    return {
      nextReduction: reducers.end,
      nextState: state,
    };
  }

  if (char === '\n') {
    return {
      tokensToEmit: [mkToken('NEWLINE', '\n')],
      nextReduction: reducers.start,
      nextState: state,
    };
  }

  return {
    nextReduction: comment,
    nextState: state,
  };
};

export default comment;
