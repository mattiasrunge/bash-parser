import type { LexerPhase, LexerPhases } from '../lexer/types.ts';
import type { Reducers } from '../tokenizer/types.ts';

export type Enums = {
  IOFileOperators: string[];
  operators: Record<string, string>;
  parameterOperators: Record<string, ParameterOp>;
  reservedWords: Record<string, string>;
};

/**
 * A mode could optionally inherit an existing one. It specifies the mode to inherit in its
 * `inherits` property. If it does, the `init` function will receive as argument the inherited mode. In this way, the child mode could use the parent mode features.
 *
 * The `init` function must return a `Mode` object.
 */

export type Mode = {
  enums: Enums;

  /**
   * An array of transform functions that are applied, in order, to the iterable of tokens returned by the `tokenizer` function.
   */
  lexerPhases: LexerPhase[];

  /**
   * A named map of all phases contained in the array. This can be used by child modes to access each phase by name and reuse them.
   */
  phaseCatalog: LexerPhases;

  reducers: Reducers;
};

/**
 * A mode plugin consists of a module in the `src/modes` folder. The module must export a `ModePlugin` object with an optional `inherits` property and a required `init` factory function.
 */
export type ModePlugin = {
  /**
   * Specifies the mode to inherit from, if any. The `init` function will receive the inherited mode as an argument, allowing the child mode to use the parent mode's features.
   */
  inherits?: string;

  /**
   * A factory function that receives the parent mode as an argument and returns a `Mode` object.
   *
   * @param parentMode - The parent mode to inherit from.
   * @returns The new mode object.
   */
  init: (parentMode?: Mode) => Mode;
};

// TODO: This checks nothing... improve!
export type ParameterOp = {
  [key in string]: ((m: RegExpMatchArray) => string | number | boolean | undefined) | string | string[];
};
