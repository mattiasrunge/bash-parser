/**
 * Assignment words, including the array forms `a=(x y)`, `a[1]=x` and `a+=x`.
 *
 * An array literal is tokenized as one word, so the boundaries between its
 * elements have to survive into the token text: the tokenizer writes
 * ARRAY_ELEMENT_SEPARATOR where the shell syntax separated two elements. It
 * replaces exactly one whitespace character, so expansion offsets stay valid.
 *
 * The boundaries cannot be recovered later from the text, because they are not
 * the same thing as field splitting: with `IFS=:` the literal `a=(x y)` is still
 * two elements, while `a=($V)` with V=`x:y` is also two.
 */
export const ARRAY_ELEMENT_SEPARATOR = '\x1F';

const ASSIGNMENT_RE = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\[([^\]]*)\])?(\+?)=/;

/**
 * The pieces of an assignment word.
 */
export type AssignmentParts = {
  /** Variable name */
  name: string;
  /** Subscript, when the target is one array element */
  subscript?: string;
  /** True for `+=` */
  append: boolean;
  /** The value text, with quotes and expansions still in it */
  value: string;
  /** Offset of `value` in the original text */
  valueStart: number;
  /** True when the value was written as a `( … )` element list */
  list: boolean;
};

/**
 * True if the text starts like an assignment (`a=`, `a+=`, `a[0]=`, `a[0]+=`).
 */
export const isAssignmentPrefix = (text: string): boolean => ASSIGNMENT_RE.test(text);

/**
 * Split an assignment word into its pieces, or return null if it is not one.
 */
export const parseAssignmentWord = (text: string): AssignmentParts | null => {
  const match = text.match(ASSIGNMENT_RE);

  if (!match) {
    return null;
  }

  const valueStart = match[0].length;
  const value = text.slice(valueStart);
  const list = value.startsWith('(') && value.endsWith(')');

  return {
    name: match[1],
    subscript: match[2],
    append: match[3] === '+',
    value: list ? value.slice(1, -1) : value,
    valueStart: list ? valueStart + 1 : valueStart,
    list,
  };
};
