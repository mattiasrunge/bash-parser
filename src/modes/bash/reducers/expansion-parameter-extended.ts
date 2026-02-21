import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';

const expansionParameterExtended: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  const xp = last(state.expansion);
  const depth = xp!.braceDepth || 0;

  if (char === '}') {
    if (depth > 0) {
      // Closing a nested ${ }, not our expansion
      return {
        nextReduction: reducers.expansionParameterExtended,
        nextState: state
          .appendChar(char)
          .replaceLastExpansion({
            parameter: (xp!.parameter || '') + char,
            braceDepth: depth - 1,
          }),
      };
    }

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

  // Track nested ${ to maintain brace depth
  if (char === '{' && xp!.parameter?.endsWith('$')) {
    return {
      nextReduction: reducers.expansionParameterExtended,
      nextState: state
        .appendChar(char)
        .replaceLastExpansion({
          parameter: (xp!.parameter || '') + char,
          braceDepth: depth + 1,
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
