import type { ModePlugin } from '../../modes/types.ts';
import phaseCatalog from './phases/mod.ts';
import reducers from './reducers/mod.ts';

const mode: ModePlugin = {
  inherits: 'bash',
  init: (parentMode) => {
    return {
      ...parentMode!,
      phaseCatalog: {
        ...parentMode!.phaseCatalog,
        ...phaseCatalog,
      },
      lexerPhases: [
        phaseCatalog.convertToWord,
        parentMode!.phaseCatalog.parameterExpansion,
        parentMode!.phaseCatalog.arithmeticExpansion,
        parentMode!.phaseCatalog.commandExpansion,
        parentMode!.phaseCatalog.tildeExpanding,
        parentMode!.phaseCatalog.quoteRemoval,
        parentMode!.phaseCatalog.defaultNodeType,
      ],
      reducers: {
        ...parentMode!.reducers,
        ...reducers,
      },
    };
  },
};

export default mode;
