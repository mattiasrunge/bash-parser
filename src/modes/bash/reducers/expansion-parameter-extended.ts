import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';
import { parameterExpansionEnd } from '../../../utils/substitution-end.ts';

// How many characters of a `${` body remain before its closing `}`, found on the body's first character
const remainingMap = new WeakMap<object, number>();

const expansionParameterExtended: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  const xp = last(state.expansion);
  const depth = xp!.braceDepth || 0;

  // The first character of the body: find the `}` that ends it, past quotes,
  // and nested expansions, once — `${HOME-"}"}`, `${x:-$(echo })}`
  if (char !== undefined && xp && xp.parameter === undefined && !remainingMap.has(xp)) {
    const end = parameterExpansionEnd(char + source.join(''));

    if (end !== -1) {
      remainingMap.set(xp, end);
    }
  }

  const remaining = xp ? remainingMap.get(xp) : undefined;

  if (char !== undefined && remaining !== undefined) {
    if (remaining === 0) {
      return {
        nextReduction: state.previousReducer,
        nextState: state.appendChar(char).replaceLastExpansion({
          type: 'ParameterExpansion',
          loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
        }),
      };
    }

    remainingMap.set(xp!, remaining - 1);

    return {
      nextReduction: reducers.expansionParameterExtended,
      nextState: state.appendChar(char).replaceLastExpansion({ parameter: (xp!.parameter || '') + char }),
    };
  }

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
