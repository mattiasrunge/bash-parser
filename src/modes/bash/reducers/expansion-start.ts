import type { Reducer } from '../../../tokenizer/types.ts';

const isSpecialParameter = (char: string) => {
  return char.match(/^[0-9\-!@#\?\*\$]$/);
};

const expansionStart: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === '{') {
    return {
      nextReduction: reducers.expansionParameterExtended,
      nextState: state.appendChar(char),
    };
  }

  if (char === '(') {
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char),
    };
  }

  if (char!.match(/[a-zA-Z_]/)) {
    return {
      nextReduction: reducers.expansionParameter,
      nextState: state.appendChar(char!).replaceLastExpansion({
        parameter: char,
        type: 'ParameterExpansion',
      }),
    };
  }

  if (isSpecialParameter(char!)) {
    return reducers.expansionSpecialParameter(state, [char!].concat(source), reducers);
  }

  return state.previousReducer(state, [char!].concat(source), reducers);
};

export default expansionStart;
