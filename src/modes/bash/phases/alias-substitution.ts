import type { LexerPhase, LexerPhaseFn } from '../../../lexer/types.ts';
import { applyVisitor, type TokenIf, type Visitor } from '../../../tokenizer/mod.ts';
import type { Resolvers } from '../../../types.ts';
import compose from '../../../utils/iterable/compose.ts';
import map from '../../../utils/iterable/map.ts';

const expandAlias = (preAliasLexer: LexerPhaseFn, resolveAlias: Resolvers['resolveAlias'], reservedWords: string[]) => {
  async function* tryExpandToken(token: TokenIf, expandingAliases: string[]): AsyncIterable<TokenIf> {
    if (expandingAliases.indexOf(token.value!) !== -1) {
      yield token;
      return;
    }
    const result = await resolveAlias!(token.value!);
    if (result === undefined) {
      yield token;
    } else {
      for await (const newToken of preAliasLexer(result)) {
        if (newToken.is('WORD') || reservedWords.some((word) => newToken.is(word))) {
          yield* tryExpandToken(
            newToken,
            expandingAliases.concat(token.value!),
          );
        } else if (!newToken.is('EOF')) {
          yield newToken;
        }
      }
    }
  }

  const expandToken = async (tk: TokenIf) => {
    const result: TokenIf[] = [];

    for await (const newToken of tryExpandToken(tk, [])) {
      result.push(newToken);
    }

    return result;
  };

  const visitor: Visitor = {
    WORD: expandToken,
  };

  reservedWords.forEach((w) => {
    visitor[w] = expandToken;
  });

  return visitor;
};

const aliasSubstitution: LexerPhase = (ctx) => {
  if (typeof ctx.resolvers.resolveAlias !== 'function') {
    return (x) => x;
  }

  const preAliasLexer = compose<TokenIf>(...ctx.previousPhases.reverse());
  const visitor = expandAlias(preAliasLexer, ctx.resolvers.resolveAlias, Object.values(ctx.enums.reservedWords));

  return compose<TokenIf>(
    map(
      applyVisitor(visitor),
    ),
  );
};

export default aliasSubstitution;
