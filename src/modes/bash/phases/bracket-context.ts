import type { LexerPhase } from '~/lexer/types.ts';
import { mkToken, type TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

/**
 * Track when we're inside [[ ]] conditional expressions.
 * Inside conditionals, certain operators are part of the expression syntax
 * and should be converted to WORD tokens so the grammar collects them.
 */
const bracketContext: LexerPhase = () => {
  let inConditional = false;

  return map(async (token: TokenIf) => {
    if (token.is('DOUBLE_OPEN_BRACKET')) {
      inConditional = true;
      return token;
    }

    if (token.is('DOUBLE_CLOSE_BRACKET')) {
      inConditional = false;
      return token;
    }

    // Inside [[ ]], convert these operators to WORD tokens:
    // - && and || are logical operators within the expression
    // - < and > are string comparison operators
    // - ( and ) are grouping operators
    if (inConditional) {
      if (
        token.is('AND_IF') ||
        token.is('OR_IF') ||
        token.is('LESS') ||
        token.is('GREAT') ||
        token.is('OPEN_PAREN') ||
        token.is('CLOSE_PAREN')
      ) {
        return mkToken('WORD', token.value, { loc: token.loc });
      }
    }

    return token;
  });
};

export default bracketContext;
