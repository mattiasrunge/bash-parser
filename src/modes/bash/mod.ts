import type { ModePlugin } from '../../modes/types.ts';
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
        phaseCatalog.parenContext,
        phaseCatalog.bracketContext,
        phaseCatalog.separator,
        phaseCatalog.reservedWords,
        phaseCatalog.linebreakIn,
        phaseCatalog.casePatterns,
        phaseCatalog.ioNumber,
        phaseCatalog.identifyMaybeSimpleCommands,
        phaseCatalog.assignmentWord,
        phaseCatalog.braceExpansion,
        phaseCatalog.parameterExpansion,
        phaseCatalog.arithmeticExpansion,
        phaseCatalog.commandExpansion,
        phaseCatalog.forNameVariable,
        phaseCatalog.functionName,
        phaseCatalog.identifySimpleCommandNames,
        phaseCatalog.aliasSubstitution,
        phaseCatalog.tildeExpanding,
        phaseCatalog.pathExpansionDetect,
        phaseCatalog.quoteRemoval,
        phaseCatalog.syntaxerrorOnContinue,
        phaseCatalog.defaultNodeType,
      ],
      reducers,
    };
  },
};

export default mode;
