import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/types.ts';
import map from '../../../utils/iterable/map.ts';

const convertToWord: LexerPhase = () =>
  map(async (tk: TokenIf) => {
    // TOKEN tokens are converted to WORD tokens
    if (tk.is('TOKEN')) {
      return tk.setType('WORD');
    }

    // other tokens are amitted as-is
    return tk;
  });

export default convertToWord;
