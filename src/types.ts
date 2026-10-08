import type { AstNodeScript } from './ast/types.ts';

/**
 * What the parser asks of the shell it parses for.
 */
export type Resolvers = {
  /**
   * A callback to resolve shell alias. If specified, the parser calls it whenever it needs to resolve an alias. It should return the resolved code if the alias exists, otherwise `undefined`. If the option is not specified, the parser won't try to resolve any alias.
   *
   * @param name - The name of the alias to resolve.
   * @returns The resolved code if the alias exists, otherwise `undefined`.
   */
  resolveAlias?: (name: string) => Promise<string | undefined>;

  /**
   * Leave tilde prefixes for the caller to expand when it runs the word, as a
   * shell has to, since `HOME` may change before then: each one is a
   * `TildeExpansion` among the word's expansions, its `value` the text after
   * the `~` (`''`, `user`, `+`, `-`, `+2`). Ignored when `resolveHomeUser` is given.
   */
  deferTildeExpansion?: boolean;
};

/**
 * The options to use for controlling how the parsing is done.
 */
export type Options = Resolvers & {
  /**
   * Which mode to use for the parsing. The mode specifies the tokenizer, lexer phases, grammar, and AST builder to use. Default is `bash`.
   */
  mode?: string;

  /**
   * If `true`, includes lines and columns information in the source file.
   */
  insertLOC?: boolean;

  /**
   * A here-document the input ends inside: `'error'` (the default) refuses it
   * as unclosed, which is what an interactive shell wants, to ask for more;
   * `'end'` takes the rest of the input as its body, as bash does running a
   * script, and marks it `unterminated` for the shell to warn about.
   */
  unterminatedHereDocuments?: 'error' | 'end';

  /**
   * The text is the body of a `$( … )`, which ends where the `)` is: a here-document whose
   * delimiter is the last line, `EOF)`, ends there, and bash warns about it as unterminated.
   */
  substitution?: boolean;

  /**
   * Read as bash reads in POSIX mode (`set -o posix`): inside a double-quoted `${…}` a `'` is a
   * plain character, not a quote, except in the pattern of `#`, `%`, `/`, `^` and `,`.
   */
  posix?: boolean;
};

/**
 * Parses a shell script and returns its AST.
 *
 * @param sourceCode - The shell script to parse.
 * @param options - The options to use for the parsing.
 * @returns The AST of the shell script.
 */
export type Parse = (sourceCode: string, options?: Options) => Promise<AstNodeScript>;
