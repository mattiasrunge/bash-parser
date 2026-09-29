/**
 * Each word's text as written, quotes and all, where quote removal changed it,
 * by the word the lexer hands the parser. Kept apart from the word so it never
 * shows in the AST; `[[ ]]` reads it for its arithmetic operands.
 */
export const writtenText = new WeakMap<object, string>();
