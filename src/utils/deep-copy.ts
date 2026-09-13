/**
 * A deep copy of plain data: primitives, arrays and objects of those.
 *
 * Tokens and their locations and expansions are exactly that, and they are
 * copied on every phase of the lexer and once per input character in the
 * tokenizer. `structuredClone` does the same job through the serializer and
 * costs an order of magnitude more, which made it most of the time spent
 * parsing. Like `structuredClone`, this keeps own enumerable properties only
 * (undefined values included) and drops prototypes, so a class instance comes
 * back as a plain object.
 */
const deepCopy = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(deepCopy) as T;
  }

  const copy: Record<string, unknown> = {};

  for (const key of Object.keys(value)) {
    copy[key] = deepCopy((value as Record<string, unknown>)[key]);
  }

  return copy as T;
};

export default deepCopy;
