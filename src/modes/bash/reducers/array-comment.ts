import type { Reducer } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR } from '../../../utils/assignment.ts';

/**
 * A comment inside an array literal, `a=( x # the first\n y )`: skipped to the
 * end of its line, whose newline separates elements as any blank does.
 */
const arrayComment: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  if (char === undefined) {
    return { nextReduction: reducers.start, nextState: state };
  }

  if (char === '\n') {
    return { nextReduction: reducers.start, nextState: state.appendChar(ARRAY_ELEMENT_SEPARATOR) };
  }

  return { nextReduction: arrayComment, nextState: state };
};

export default arrayComment;
