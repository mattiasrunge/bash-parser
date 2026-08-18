import type { Reducer } from '../../../tokenizer/types.ts';

const isSpecialParameter = (char: string) => {
  return char.match(/^[0-9\-!@#\?\*\$]$/);
};

const expansionStart: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  // ANSI-C quoting, `$'a\nb'` — but only outside double quotes, where bash
  // leaves it alone. The empty expansion the `$` opened is dropped: this is a
  // quoting form, not an expansion.
  if (char === "'" && state.previousReducer === reducers.start) {
    return {
      nextReduction: reducers.dollarSingleQuoting,
      nextState: state.setExpansion(state.expansion.slice(0, -1)).saveDelimiterStart().appendChar(char),
    };
  }

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

  // The `$` starts nothing — drop the expansion it opened, or the word would
  // look like it still had one to resolve and quote removal would skip it
  return state.previousReducer(state.setExpansion(state.expansion.slice(0, -1)), [char!].concat(source), reducers);
};

export default expansionStart;
