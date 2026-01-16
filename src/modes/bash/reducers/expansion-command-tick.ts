import { mkToken, type Reducer } from '~/tokenizer/mod.ts';
import last from '~/utils/last.ts';

const expansionCommandTick: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  const xp = last(state.expansion);

  if (!state.escaping && char === '`') {
    return {
      nextReduction: state.previousReducer,
      nextState: state.appendChar(char).replaceLastExpansion({
        type: 'CommandExpansion',
        loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
      }),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken('CONTINUE', '`')],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  if (!state.escaping && char === '\\') {
    return {
      nextReduction: reducers.expansionCommandTick,
      nextState: state.appendChar(char).setEscaping(true),
    };
  }

  return {
    nextReduction: reducers.expansionCommandTick,
    nextState: state
      .setEscaping(false)
      .appendChar(char)
      .replaceLastExpansion({ command: (xp!.command || '') + char }),
  };
};

export default expansionCommandTick;
