import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/types.ts';
import map from '../../../utils/iterable/map.ts';

const convertToWord: LexerPhase = () =>
  map(async (tk: TokenIf) => {
    if (tk.is('TOKEN')) {
      return tk.setType('WORD');
    }

    return tk;
  });

export default convertToWord;
