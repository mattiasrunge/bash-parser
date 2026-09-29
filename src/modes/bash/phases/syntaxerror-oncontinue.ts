import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import { BashSyntaxError } from '../../../errors.ts';
import map from '../../../utils/iterable/map.ts';

/** What closes each construct the input can end inside, as bash names it. */
const CLOSERS: Record<string, string> = {
  '"': '"',
  "'": "'",
  "$'": "'",
  '`': '`',
  '(': ')',
  '$(': ')',
  '$((': ')',
  '${': '}',
  '$[': ']',
};

const syntaxerrorOnContinue: LexerPhase = () => {
  return map(async (tk: TokenIf) => {
    if (tk && tk.is('CONTINUE')) {
      const error = new BashSyntaxError('Unclosed ' + tk.value, undefined, {
        start: {
          row: tk.loc?.start.row,
          col: tk.loc?.start.col,
          char: tk.loc?.start.char,
        },
      });

      error.detail = { kind: 'unclosed', closer: CLOSERS[tk.value!] ?? tk.value! };
      throw error;
    }

    return tk;
  });
};

export default syntaxerrorOnContinue;
