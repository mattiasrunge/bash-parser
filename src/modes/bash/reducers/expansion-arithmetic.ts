import { mkToken, type Reducer } from '~/tokenizer/mod.ts';
import last from '~/utils/last.ts';

const expansionArithmetic: Reducer = (state, source) => {
  const char = source && source.shift();

  const xp = last(state.expansion);
  if (char === ')' && state.current.slice(-1)[0] === ')') {
    return {
      nextReduction: state.previousReducer,
      nextState: state
        .appendChar(char)
        .replaceLastExpansion({
          type: 'ArithmeticExpansion',
          expression: xp!.value!.slice(0, -1),
          loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
        })
        .deleteLastExpansionValue(),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken('CONTINUE', '$((')],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  return {
    nextReduction: expansionArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ value: (xp?.value || '') + char }),
  };
};

export default expansionArithmetic;
