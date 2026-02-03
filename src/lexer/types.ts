import type { Enums } from '../modes/types.ts';
import type { TokenIf } from '../tokenizer/types.ts';
import type { Resolvers } from '../types.ts';

/**
 * `LexerPhase` functions are applied, in order, to the iterable returned from the `tokenizer` function. Each phase enhances or alters the tokens to produce a final token iterable, directly consumable by the grammar parser.
 *
 * Each phase is a function that accepts the parser option object, an array of all phases that precede it in the pipeline, and the utils object. The function returns another function that receives the iterable produced by the previous phase and returns the iterable to give to the subsequent one.
 */
export type LexerMapper = (tokens: AsyncIterable<TokenIf>) => AsyncIterable<TokenIf>;

export type LexerContext = {
  resolvers: Resolvers;
  enums: Enums;
  previousPhases: LexerPhaseFn[];
};

export type LexerPhase = (ctx: LexerContext) => LexerMapper;

export type LexerPhaseFn = (...input: any[]) => AsyncIterable<TokenIf>;

export type LexerPhases = Record<string, LexerPhase>;
