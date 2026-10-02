import type { LexerPhase, LexerPhaseFn } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import type { Resolvers } from '../../../types.ts';
import compose from '../../../utils/iterable/compose.ts';
import map from '../../../utils/iterable/map.ts';

/**
 * Aliases, as bash expands them: a word where a command's name stands, not an
 * argument — `type ll` asks about `ll` — and, after an alias whose text ends
 * in a blank, the word that follows it as well (`alias sudo='sudo '`). What an
 * alias gives is read again the same way, an alias not expanding inside itself.
 */
const expandAlias = (preAliasLexer: LexerPhaseFn, resolveAlias: Resolvers['resolveAlias'], reservedWords: string[]) => {
  // The word after an alias ending in a blank is checked too
  let checkNext = false;

  // A reserved word stands where a command starts, and bash looks it up first:
  // `alias fi=echo` makes `fi x` print x. `in` is the exception, never a command.
  const commandName = (token: TokenIf) => (token.is('WORD') && !!token.ctx?.maybeSimpleCommandName) || (!token.is('In') && reservedWords.some((word) => token.is(word)));

  async function* tryExpandToken(token: TokenIf, expandingAliases: string[]): AsyncIterable<TokenIf> {
    const result = expandingAliases.includes(token.value!) ? undefined : await resolveAlias!(token.value!);

    if (result === undefined) {
      yield token;
      return;
    }

    // Text that does not stand on its own — `alias c='echo $(date'`, closed
    // where the alias is used — bash reads on into the script; here the word
    // stays itself, and the script's error is the one told
    const tokens: TokenIf[] = [];

    try {
      for await (const newToken of preAliasLexer(result)) {
        tokens.push(newToken);
      }
    } catch {
      yield token;
      return;
    }

    if (tokens.some((newToken) => newToken.is('CONTINUE'))) {
      yield token;
      return;
    }

    for (const read of tokens) {
      if (read.is('EOF')) continue;

      // What an alias gives stands where its name stood in the script: its line is the command's
      const newToken = token.loc ? read.clone({ loc: token.loc }) : read;

      const check = commandName(newToken) || (checkNext && newToken.is('WORD'));

      checkNext = false;

      if (check) {
        yield* tryExpandToken(newToken, expandingAliases.concat(token.value!));
      } else {
        yield newToken;
      }
    }

    if (/[ \t]$/.test(result)) {
      checkNext = true;
    }
  }

  const expandToken = async (tk: TokenIf) => {
    const check = commandName(tk) || (checkNext && tk.is('WORD'));

    checkNext = false;

    if (!check) {
      return tk;
    }

    const result: TokenIf[] = [];

    for await (const newToken of tryExpandToken(tk, [])) {
      result.push(newToken);
    }

    return result;
  };

  return expandToken;
};

const aliasSubstitution: LexerPhase = (ctx) => {
  if (typeof ctx.resolvers.resolveAlias !== 'function') {
    return (x) => x;
  }

  const preAliasLexer = compose<TokenIf>(...ctx.previousPhases.reverse());
  const expandToken = expandAlias(preAliasLexer, ctx.resolvers.resolveAlias, Object.values(ctx.enums.reservedWords));

  // Every token passes, so that the one after an alias ending in a blank is the next one seen
  return compose<TokenIf>(map(expandToken));
};

export default aliasSubstitution;
