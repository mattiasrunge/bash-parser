import type { LexerPhase } from '../../../lexer/types.ts';
import { mkToken, type TokenIf } from '../../../tokenizer/mod.ts';
import compose from '../../../utils/iterable/compose.ts';
import map from '../../../utils/iterable/map.ts';

export const fieldSplitting: LexerPhase = () =>
  compose<TokenIf>(
    map(async (token: TokenIf) => {
      if (token.is('WORD')) {
        const fields = token.value!.split('\0');

        if (fields.length > 1) {
          let idx = 0;

          return fields.map((field) =>
            mkToken(token.type, field, {
              loc: token.loc,

              expansion: token.expansion,

              joined: token.value,
              fieldIdx: idx++,
              originalText: token.originalText,
            })
          );
        }
      }

      return token;
    }),
  );

export default fieldSplitting;
