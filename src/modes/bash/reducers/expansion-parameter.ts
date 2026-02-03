import type { Reducer } from '../../../tokenizer/types.ts';
import last from '../../../utils/last.ts';

const expansionParameter: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  const xp = last(state.expansion);

  if (char === undefined) {
    return {
      nextReduction: reducers.start,
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  if (char.match(/[0-9a-zA-Z_]/)) {
    return {
      nextReduction: reducers.expansionParameter,
      nextState: state.appendChar(char).replaceLastExpansion({
        parameter: xp!.parameter + (char || ''),
      }),
    };
  }

  return state.previousReducer(
    state.replaceLastExpansion({ loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }) }),
    [char].concat(source),
    reducers,
  );
};

export default expansionParameter;
