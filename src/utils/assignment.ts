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
// A Unicode noncharacter, which no text holds: `\x1F`, which this was, is a
// character a value may have, `a=($'x\x1fy')`
export const ARRAY_ELEMENT_SEPARATOR = '\uFDD1';

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
 * Where the subscript that opens at `open` closes, or -1: bash's skipsubscript,
 * which counts brackets and steps over what is quoted, escaped or substituted,
 * so that `a[']']=1` and `a["x]"]=1` have one subscript each.
 */
export const subscriptEnd = (text: string, open: number): number => {
  let depth = 0;

  for (let i = open; i < text.length; i++) {
    const char = text[i];

    if (char === '\\') {
      i++;
    } else if (char === "'") {
      i = text.indexOf("'", i + 1);
    } else if (char === '"' || char === '`') {
      i = closingQuote(text, i);
    } else if (char === '$' && (text[i + 1] === '(' || text[i + 1] === '{')) {
      i = closingBracket(text, i + 1);
    } else if (char === '[') {
      depth++;
    } else if (char === ']' && --depth === 0) {
      return i;
    }

    if (i === -1) return -1;
  }

  return -1;
};

const closingQuote = (text: string, open: number): number => {
  for (let i = open + 1; i < text.length; i++) {
    if (text[i] === '\\') i++;
    else if (text[i] === text[open]) return i;
  }

  return -1;
};

const closingBracket = (text: string, open: number): number => {
  const [opener, closer] = text[open] === '(' ? ['(', ')'] : ['{', '}'];
  let depth = 0;

  for (let i = open; i < text.length; i++) {
    const char = text[i];

    if (char === '\\') {
      i++;
    } else if (char === "'") {
      i = text.indexOf("'", i + 1);
    } else if (char === '"' || char === '`') {
      i = closingQuote(text, i);
    } else if (char === opener) {
      depth++;
    } else if (char === closer && --depth === 0) {
      return i;
    }

    if (i === -1) return -1;
  }

  return -1;
};

/**
 * The part of an assignment before its value, as bash's assignment() reads it:
 * a name, a subscript up to its own `]`, `+` for appending, and the `=`.
 */
const assignmentHead = (text: string): { name: string; subscript?: string; append: boolean; end: number } | null => {
  const name = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(text)?.[0];

  if (!name) return null;

  let at = name.length;
  let subscript: string | undefined;

  if (text[at] === '[') {
    const close = subscriptEnd(text, at);

    if (close === -1) return null;

    subscript = text.slice(at + 1, close);
    at = close + 1;
  }

  const append = text[at] === '+';

  if (append) at++;
  if (text[at] !== '=') return null;

  return { name, subscript, append, end: at + 1 };
};

/**
 * True if the text starts like an assignment (`a=`, `a+=`, `a[0]=`, `a[0]+=`).
 */
export const isAssignmentPrefix = (text: string): boolean => assignmentHead(text) !== null;

/**
 * Split an assignment word into its pieces, or return null if it is not one.
 * The subscript is as written, quotes and all: expanding it is the executor's.
 */
export const parseAssignmentWord = (text: string): AssignmentParts | null => {
  const head = assignmentHead(text);

  if (!head) {
    return null;
  }

  const valueStart = head.end;
  const value = text.slice(valueStart);
  const list = value.startsWith('(') && value.endsWith(')');

  return {
    name: head.name,
    subscript: head.subscript,
    append: head.append,
    value: list ? value.slice(1, -1) : value,
    valueStart: list ? valueStart + 1 : valueStart,
    list,
  };
};
