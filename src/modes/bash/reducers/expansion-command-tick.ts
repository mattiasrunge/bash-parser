import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';

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
      tokensToEmit: [mkToken(
        'CONTINUE',
        '`',
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

  // Between backticks a backslash quotes only $, ` and \, and joins a line to
  // the next; before anything else it is itself, and part of the command:
  // `echo "(\")"` keeps its \"
  if (!state.escaping && char === '\\' && '$`\\\n'.includes(source[0] ?? '')) {
    return {
      nextReduction: reducers.expansionCommandTick,
      nextState: state.appendChar(char).setEscaping(true),
    };
  }

  // A backslash-newline is a line continuation: gone from the command altogether
  if (state.escaping && char === '\n') {
    return {
      nextReduction: reducers.expansionCommandTick,
      nextState: state.setEscaping(false).appendChar(char),
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
