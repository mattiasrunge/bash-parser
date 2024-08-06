import reducers from '~/modes/posix/tokenizer/reducers/mod.ts';
import type { LexerPhase, ModePlugin, Reducer, TokenIf } from '~/types.ts';
import map from '~/utils/iterable/map.ts';
import { tokenOrEmpty } from '~/utils/tokens.ts';

const convertToWord: LexerPhase = () =>
  map((tk: TokenIf) => {
    // TOKEN tokens are converted to WORD tokens
    if (tk.is('TOKEN')) {
      return tk.changeTokenType('WORD', tk.value!);
    }

    // other tokens are amitted as-is
    return tk;
  });

const start: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    return {
      nextReduction: reducers.end,
      tokensToEmit: tokenOrEmpty(state),
      nextState: state.resetCurrent().saveCurrentLocAsStart(),
    };
  }

  if (state.escaping && char === '\n') {
    return {
      nextReduction: reducers.start,
      nextState: state.setEscaping(false).removeLastChar(),
    };
  }

  if (!state.escaping && char === '\\') {
    return {
      nextReduction: reducers.start,
      nextState: state.setEscaping(true).appendChar(char),
    };
  }

  if (!state.escaping && char === "'") {
    return {
      nextReduction: reducers.singleQuoting,
      nextState: state.appendChar(char),
    };
  }

  if (!state.escaping && char === '"') {
    return {
      nextReduction: reducers.doubleQuoting,
      nextState: state.appendChar(char),
    };
  }

  if (!state.escaping && char === '$') {
    return {
      nextReduction: reducers.expansionStart,
      nextState: state.appendChar(char).appendEmptyExpansion(),
    };
  }

  if (!state.escaping && char === '`') {
    return {
      nextReduction: reducers.expansionCommandTick,
      nextState: state.appendChar(char).appendEmptyExpansion(),
    };
  }

  return {
    nextReduction: reducers.start,
    nextState: state.appendChar(char).setEscaping(false),
  };
};

const mode: ModePlugin = {
  inherits: 'posix',
  init: (posixMode) => {
    const lexerPhases = [
      convertToWord,
      posixMode!.phaseCatalog.parameterExpansion,
      posixMode!.phaseCatalog.arithmeticExpansion,
      posixMode!.phaseCatalog.commandExpansion,
      posixMode!.phaseCatalog.tildeExpanding,
      posixMode!.phaseCatalog.parameterExpansionResolve,
      posixMode!.phaseCatalog.commandExpansionResolve,
      posixMode!.phaseCatalog.arithmeticExpansionResolve,
      posixMode!.phaseCatalog.fieldSplitting,
      posixMode!.phaseCatalog.pathExpansion,
      posixMode!.phaseCatalog.quoteRemoval,
      posixMode!.phaseCatalog.defaultNodeType,
    ];

    const tokenizer = () => posixMode!.tokenizer({ ...reducers, start });

    return {
      ...posixMode!,
      lexerPhases,
      tokenizer,
    };
  },
};

export default mode;
