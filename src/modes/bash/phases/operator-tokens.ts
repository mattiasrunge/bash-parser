import type { LexerPhase } from '../../../lexer/types.ts';
import { applyVisitor, type TokenIf } from '../../../tokenizer/mod.ts';
import map from '../../../utils/iterable/map.ts';

const reduceToOperatorTokenVisitor = (operators: Record<string, string>) => ({
  async OPERATOR(tk: TokenIf) {
    if (tk.value! in operators) {
      return tk.setType(operators[tk.value!]);
    }
    return tk;
  },
});

const operatorTokens: LexerPhase = (ctx) =>
  map(
    applyVisitor(reduceToOperatorTokenVisitor(ctx.enums.operators)),
  );

export default operatorTokens;
