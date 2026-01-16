import type { ModePlugin } from '~/modes/types.ts';
import enums from './enums/mod.ts';
import phaseCatalog from './phases/mod.ts';
import reducers from './reducers/mod.ts';

const mode: ModePlugin = {
  init: () => {
    return {
      enums,
      phaseCatalog,
      lexerPhases: [
        phaseCatalog.newLineList,
        phaseCatalog.operatorTokens,
        phaseCatalog.separator,
        // loggerPhase('1'),
        phaseCatalog.reservedWords,
        // loggerPhase('2'),
        phaseCatalog.linebreakIn,
        phaseCatalog.ioNumber,
        phaseCatalog.identifyMaybeSimpleCommands,
        phaseCatalog.assignmentWord,
        phaseCatalog.parameterExpansion,
        phaseCatalog.arithmeticExpansion,
        phaseCatalog.commandExpansion,
        // loggerPhase('pre-forNameVariable'),
        phaseCatalog.forNameVariable,
        // loggerPhase('post-forNameVariable'),
        phaseCatalog.functionName,
        phaseCatalog.identifySimpleCommandNames,
        // loggerPhase('3'),
        phaseCatalog.aliasSubstitution,
        // loggerPhase('4'),
        // loggerPhase('post'),
        phaseCatalog.tildeExpanding,
        phaseCatalog.parameterExpansionResolve,
        phaseCatalog.commandExpansionResolve,
        phaseCatalog.arithmeticExpansionResolve,
        phaseCatalog.fieldSplitting,
        phaseCatalog.pathExpansionDetect,
        phaseCatalog.pathExpansion,
        phaseCatalog.quoteRemoval,
        phaseCatalog.syntaxerrorOnContinue,
        phaseCatalog.defaultNodeType,
        // loggerPhase('tokenizer'),
      ],
      reducers,
    };
  },
};

export default mode;
