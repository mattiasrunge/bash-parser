import type { Reducer } from '../../../tokenizer/types.ts';
import last from '../../../utils/last.ts';

const expansionSpecialParameter: Reducer = (state, source) => {
  const char = source && source.shift();

  const xp = last(state.expansion);

  return {
    nextReduction: state.previousReducer,
    nextState: state.appendChar(char!).replaceLastExpansion({
      parameter: char,
      type: 'ParameterExpansion',
      loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
    }),
  };
};

export default expansionSpecialParameter;
