import type { Enums } from '../modes/types.ts';
import type { TokenIf } from '../tokenizer/types.ts';
import type { Resolvers } from '../types.ts';

export type LexerMapper = (tokens: AsyncIterable<TokenIf>) => AsyncIterable<TokenIf>;

export type LexerContext = {
  resolvers: Resolvers;
  enums: Enums;
  previousPhases: LexerPhaseFn[];
};

/**
 * A step of the lexer: given the context, a function from the tokens of the phase before it to
 * the tokens for the next. A mode applies its phases in order to the tokenizer's output, and the
 * last one's tokens go to the grammar parser.
 */
export type LexerPhase = (ctx: LexerContext) => LexerMapper;

export type LexerPhaseFn = (...input: any[]) => AsyncIterable<TokenIf>;

export type LexerPhases = Record<string, LexerPhase>;
