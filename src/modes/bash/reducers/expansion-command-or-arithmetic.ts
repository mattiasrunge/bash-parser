import { mkToken, type Reducer } from '~/tokenizer/mod.ts';
import last from '~/utils/last.ts';

const expansionCommandOrArithmetic: Reducer = (state, source, reducers) => {
  const char = source && source.shift();
  const xp = last(state.expansion);

  if (char === '(' && state.current.slice(-2) === '$(') {
    return {
      nextReduction: reducers.expansionArithmetic,
      nextState: state.appendChar(char),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken('CONTINUE', '$(')],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  if (char === ')') {
    return {
      nextReduction: state.previousReducer,
      nextState: state.appendChar(char).replaceLastExpansion({
        type: 'CommandExpansion',
        loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
      }),
    };
  }

  return {
    nextReduction: reducers.expansionCommandOrArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
  };
};

export default expansionCommandOrArithmetic;
