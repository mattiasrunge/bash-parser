import type { ParameterOp } from '../../../modes/types.ts';

// A parameter name, optionally subscripted, or the positional list: every
// operator below works on one array element (`${a[0]:-x}`), on a whole array
// (`${#a[@]}`, `${a[@]%.jpg}`) and on the positional parameters (`${@:2}`) as
// well as on a scalar. The subscript stays part of the captured parameter;
// splitting it off is the executor's job, since evaluating it needs the
// variables.
// A variable (an element too), $@ and $*, a positional parameter, or $? $$ $!
const name = '(?:[a-zA-Z_][a-zA-Z0-9_]*(?:\\[[^\\]]*\\])?|[@*]|[0-9]+|[?$!])';

/**
 * `offset:length` of a substring expansion, split at the `:` between them —
 * not at one that belongs to a `?` in the offset, `${x:1 ? 4 : 2:1}`, nor one
 * inside parentheses or a nested expansion, `${x:${y:-0}}`.
 */
function substringParts(text: string): [string, string | undefined] {
  let questions = 0;
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '(' || c === '{') depth++;
    else if (c === ')' || c === '}') depth--;
    else if (c === '?' && depth === 0) questions++;
    else if (c === ':' && depth === 0) {
      if (questions > 0) questions--;
      else return [text.slice(0, i), text.slice(i + 1)];
    }
  }

  return [text, undefined];
}

/**
 * `${x/pattern/string}` after the first `/`: `/` again for every match, `#`
 * or `%` to anchor at the start or the end, then the pattern up to the next
 * `/` that is neither escaped, quoted nor inside a nested expansion, and the
 * string after it — absent when there is no such `/`, which deletes the match.
 */
function patsubParts(text: string): { globally: boolean; anchor?: '#' | '%'; pattern: string; replacement?: string } {
  const globally = text.startsWith('/');
  const anchor = !globally && (text[0] === '#' || text[0] === '%') ? text[0] as '#' | '%' : undefined;
  const rest = globally || anchor ? text.slice(1) : text;
  let depth = 0;
  let quote = '';

  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];

    if (quote === "'") {
      if (c === "'") quote = '';
    } else if (c === '\\') {
      i++;
    } else if (quote === '"') {
      if (c === '"') quote = '';
    } else if (c === "'" || c === '"') {
      quote = c;
    } else if (c === '$' && (rest[i + 1] === '{' || rest[i + 1] === '(')) {
      depth++;
      i++;
    } else if ((c === '}' || c === ')') && depth > 0) {
      depth--;
    } else if (c === '/' && depth === 0) {
      return { globally, anchor, pattern: rest.slice(0, i), replacement: rest.slice(i + 1) };
    }
  }

  return { globally, anchor, pattern: rest, replacement: undefined };
}

const parameterOps: Record<string, ParameterOp> = {
  // POSIX implementation

  [`^(${name}):\\-(.*)$`]: {
    op: 'useDefaultValue',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name}):\\=(.*)$`]: {
    op: 'assignDefaultValue',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name}):\\?(.*)$`]: {
    op: 'indicateErrorIfNull',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name}):\\+(.*)$`]: {
    op: 'useAlternativeValue',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\-(.*)$`]: {
    op: 'useDefaultValueIfUnset',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\=(.*)$`]: {
    op: 'assignDefaultValueIfUnset',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\?(.*)$`]: {
    op: 'indicateErrorIfUnset',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\+(.*)$`]: {
    op: 'useAlternativeValueIfUnset',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\%\\%(.*)$`]: {
    op: 'removeLargestSuffixPattern',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\#\\#(.*)$`]: {
    op: 'removeLargestPrefixPattern',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\%(.*)$`]: {
    op: 'removeSmallestSuffixPattern',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  [`^(${name})\\#(.*)$`]: {
    op: 'removeSmallestPrefixPattern',
    parameter: (m) => m[1],
    word: (m) => m[2],
    expand: ['word'],
  },

  // `${#1}`, `${#?}` too: the length of a positional or special parameter
  [`^\\#(${name}|[#-])$`]: {
    op: 'stringLength',
    parameter: (m) => m[1],
  },

  [`^([1-9][0-9]*)$`]: {
    kind: 'positional',
    parameter: (m) => Number(m[1]),
  },

  '^!$': {
    kind: 'last-background-pid',
  },

  '^\\@$': {
    kind: 'positional-list',
  },

  '^\\-$': {
    kind: 'current-option-flags',
  },

  '^\\#$': {
    kind: 'positional-count',
  },

  '^\\?$': {
    kind: 'last-exit-status',
  },

  '^\\*$': {
    kind: 'positional-string',
  },

  '^\\$$': {
    kind: 'shell-process-id',
  },

  '^0$': {
    kind: 'shell-script-name',
  },

  // From bash implementation

  // This is referred to as Substring Expansion.
  // It expands to up to length characters of the value
  // of parameter starting at the character specified by offset.
  // Both are arithmetic expressions, `${x:i:n}`, as written; `offset` and
  // `length` are their values when they are plain numbers
  [`^(${name}):(.*)$`]: {
    op: 'substring',
    parameter: (m) => m[1],
    offset: (m) => parseInt(substringParts(m[2])[0], 10),
    length: (m) => {
      const length = substringParts(m[2])[1];
      return length === undefined ? undefined : parseInt(length, 10);
    },
    offsetExpression: (m) => substringParts(m[2])[0],
    lengthExpression: (m) => substringParts(m[2])[1],
  },

  // Expands to the names of variables whose names begin with prefix,
  // separated by the first character of the IFS special variable.
  // When ‘@’ is used and the expansion appears within double quotes,
  // each variable name expands to a separate word.
  // TODO: @ case may need some investigation, maybe it's not actually possible
  [`^!(${name})(\\*|@)$`]: {
    op: 'prefix',
    prefix: (m) => m[1],
    expandWords: (m) => m[2] === '@',
    parameter: () => undefined,
  },

  // If name is an array variable, expands to the list of array indices
  // (keys) assigned in name. If name is not an array, expands to 0 if
  // name is set and null otherwise. When ‘@’ is used and the expansion
  // appears within double quotes, each key expands to a separate word.
  // TODO: @ case may need some investigation, maybe it's not actually possible
  [`^!(${name})(\\[\\*\\]|\\[@\\])$`]: {
    op: 'arrayIndices',
    parameter: (m) => m[1],
    expandWords: (m) => m[2] === '[@]',
  },

  // Parameter is expanded and the longest match of pattern against its
  // value is replaced with string. If pattern begins with ‘/’, all matches
  // of pattern are replaced with string.
  [`^(${name})\\/(.*)$`]: {
    op: 'stringReplace',
    parameter: (m) => m[1],
    globally: (m) => patsubParts(m[2]).globally,
    anchor: (m) => patsubParts(m[2]).anchor,
    // As written, and parsed as the words they are: the executor needs both,
    // since what was quoted in the pattern matches itself
    substitute: (m) => patsubParts(m[2]).pattern,
    replace: (m) => patsubParts(m[2]).replacement,
    pattern: (m) => patsubParts(m[2]).pattern,
    replacement: (m) => patsubParts(m[2]).replacement,
    expand: ['pattern', 'replacement'],
  },

  // This expansion modifies the case of alphabetic characters in parameter.
  // The pattern is expanded to produce a pattern just as in filename expansion.
  // Each character in the expanded value of parameter is tested against pattern,
  // and, if it matches the pattern, its case is converted. The pattern should
  // not attempt to match more than one character. The ‘^’ operator converts
  // lowercase letters matching pattern to uppercase; the ‘,’ operator converts
  // matching uppercase letters to lowercase. The ‘^^’ and ‘,,’ expansions convert
  // each matched character in the expanded value; the ‘^’ and ‘,’ expansions match
  // and convert only the first character in the expanded value. If pattern is omitted,
  // it is treated like a ‘?’, which matches every character. If parameter is ‘@’
  // or ‘*’, the case modification operation is applied to each positional parameter
  // in turn, and the expansion is the resultant list. If parameter is an array variable
  // subscripted with ‘@’ or ‘*’, the case modification operation is applied to each
  // member of the array in turn, and the expansion is the resultant list.
  [`^(${name})(\\^\\^|\\^|,,|,)(.*)$`]: {
    op: 'caseChange',
    parameter: (m) => m[1],
    pattern: (m) => m[3] || '?',
    case: (m) => m[2][0] === ',' ? 'lower' : 'upper',
    globally: (m) => m[2].length === 2,
  },

  // The expansion is either a transformation of the value of parameter or information about
  // parameter itself, depending on the value of operator. Each operator is a single letter:
  //
  // Q - The expansion is a string that is the value of parameter quoted in a format that can
  // 	be reused as input.
  // E - The expansion is a string that is the value of parameter with backslash escape
  // 	sequences expanded as with the $'…' quoting mechansim.
  // P - The expansion is a string that is the result of expanding the value of parameter
  // 	as if it were a prompt string (see Controlling the Prompt).
  // A - The expansion is a string in the form of an assignment statement or declare command
  // 	that, if evaluated, will recreate parameter with its attributes and value.
  // a - The expansion is a string consisting of flag values representing parameter’s attributes.
  //
  // If parameter is ‘@’ or ‘*’, the operation is applied to each positional parameter in turn,
  // and the expansion is the resultant list. If parameter is an array variable subscripted
  // with ‘@’ or ‘*’, the operation is applied to each member of the array in turn, and the
  // expansion is the resultant list.
  // The result of the expansion is subject to word splitting and pathname expansion as
  // described below.
  [`^(${name})@([QEPAaUuLKk])$`]: {
    op: 'transformation',
    parameter: (m) => m[1],
    // The operator's letter, as written
    transform: (m) => m[2],
    kind: (m) => {
      switch (m[2]) {
        case 'Q':
          return 'quoted';
        case 'E':
          return 'escape';
        case 'P':
          return 'prompt';
        case 'A':
          return 'assignment';
        case 'a':
          return 'flags';
        case 'U':
          return 'upper';
        case 'u':
          return 'upperFirst';
        case 'L':
          return 'lower';
        case 'K':
        case 'k':
          return 'keys';
        default:
          return 'unknown';
      }
    },
  },

  // If the first character of parameter is an exclamation point (!), and parameter is not
  // a nameref, it introduces a level of variable indirection. Bash uses the value of the
  // variable formed from the rest of parameter as the name of the variable; this variable
  // is then expanded and that value is used in the rest of the substitution, rather than
  // the value of parameter itself. This is known as indirect expansion. If parameter is a
  // nameref, this expands to the name of the variable referenced by parameter instead of
  // performing the complete indirect expansion. The exceptions to this are the expansions
  // of ${!prefix*} and ${!name[@]} described below. The exclamation point must immediately
  // follow the left brace in order to introduce indirection.
  [`^!(.+)$`]: {
    op: 'indirection',
    word: (m) => m[1],
    parameter: () => undefined,
  },
};

export default parameterOps;
