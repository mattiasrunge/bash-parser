import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import { BashSyntaxError } from '../../../errors.ts';
import map from '../../../utils/iterable/map.ts';

const syntaxerrorOnContinue: LexerPhase = () => {
  return map(async (tk: TokenIf) => {
    if (tk && tk.is('CONTINUE')) {
      throw new BashSyntaxError('Unclosed ' + tk.value, undefined, {
        start: {
          row: tk.loc?.start.row,
          col: tk.loc?.start.col,
          char: tk.loc?.start.char,
        },
      });
    }

    return tk;
  });
};

export default syntaxerrorOnContinue;
