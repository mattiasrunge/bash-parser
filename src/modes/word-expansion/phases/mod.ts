import type { LexerPhases } from '../../../lexer/types.ts';
import convertToWord from './convert-to-word.ts';

const rules: LexerPhases = {
  convertToWord,
};

export default rules;
