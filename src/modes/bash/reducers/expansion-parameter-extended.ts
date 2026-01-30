import { mkToken, type Reducer } from '~/tokenizer/mod.ts';
import last from '~/utils/last.ts';

const expansionParameterExtended: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  const xp = last(state.expansion);

  if (char === '}') {
    return {
      nextReduction: state.previousReducer,
      nextState: state.appendChar(char).replaceLastExpansion({
        type: 'ParameterExpansion',
        loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
      }),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken(
        'CONTINUE',
        '${',
        xp?.loc
          ? {
            loc: {
              start: { char: xp.loc.start },
              end: { char: xp.loc.start },
            },
          }
          : undefined,
      )],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  return {
    nextReduction: reducers.expansionParameterExtended,
    nextState: state
      .appendChar(char)
      .replaceLastExpansion({ parameter: (xp!.parameter || '') + char }),
  };
};

export default expansionParameterExtended;
