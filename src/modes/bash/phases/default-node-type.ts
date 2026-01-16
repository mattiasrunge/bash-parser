import { assert } from '@std/assert';
import type { LexerPhase } from '~/lexer/types.ts';
import type { Expansion, TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';
import toPascal from '~/utils/to-pascal-case.ts';

const defaultNodeType: LexerPhase = () =>
  map(async (token: TokenIf) => {
    const tk = JSON.parse(JSON.stringify(token));

    assert(tk.type, 'Token type is required');

    tk.ctx.originalType = token.type;

    // console.log({defaultNodeType, tk})
    // if (token.is('WORD') || token.is('NAME') || token.is('ASSIGNMENT_WORD')) {
    tk.type = toPascal(tk.type);
    // } else {
    //   tk.type = token.type.toLowerCase();
    // }
    if (tk.expansion) {
      tk.expansion = tk.expansion.filter((xp: Expansion) => !!xp.type);

      for (const xp of tk.expansion || []) {
        xp.type = toPascal(xp.type!);
      }
    }
    Object.freeze(tk);

    return tk;
  });

export default defaultNodeType;
