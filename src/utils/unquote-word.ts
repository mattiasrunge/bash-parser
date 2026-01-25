export type ParseResult = {
  values: string[];
  comment?: string;
};

export type SingleParseResult = {
  value: string;
  comment?: string;
};

const RE_META = '|&;()<> \\t';
const RE_BAREWORD = `(\\\\['"${RE_META}']|[^\\s'"${RE_META}'])+`;
const RE_SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
const RE_DOUBLE_QUOTE = "'((\\\\'|[^'])*?)'";
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';

/**
 * Hand-written scanner/parser for Bash quoting rules:
 *
 *  1. inside single quotes, all characters are printed literally.
 *  2. inside double quotes, all characters are printed literally
 *     except variables prefixed by '$' and backslashes followed by
 *     either a double quote or another backslash.
 *  3. outside of any quotes, backslashes are treated as escape
 *     characters and not printed (unless they are themselves escaped)
 *  4. quote context can switch mid-token if there is no whitespace
 *     between the two quote contexts (e.g. all'one'"token" parses as
 *     "allonetoken")
 */
const parseChunk = (chunks: string[], idx: number): SingleParseResult => {
  const chunk = chunks[idx];
  const result: SingleParseResult = { value: '' };

  let currentQuote: string | null = null;
  let isEscaped = false;

  for (let i = 0, len = chunk.length; i < len; i++) {
    let c = chunk.charAt(i);

    if (isEscaped) {
      result.value += c;
      isEscaped = false;
    } else if (currentQuote) {
      if (c === currentQuote) {
        currentQuote = null;
      } else if (currentQuote === SINGLE_QUOTE) {
        result.value += c;
      } else if (c === BACKSLASH) {
        i += 1;
        c = chunk.charAt(i);

        if (c === DOUBLE_QUOTE || c === BACKSLASH || c === '$' || c === '`') {
          result.value += c;
        } else {
          result.value += BACKSLASH + c;
        }
      } else {
        result.value += c;
      }
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      currentQuote = c;
    } else if (RegExp('^#$').test(c)) {
      result.comment = chunk.slice(i + 1) + chunks.slice(idx + 1).join(' ');
      break;
    } else if (c === BACKSLASH) {
      isEscaped = true;
    } else {
      result.value += c;
    }
  }

  return result;
};

const unquoteWord = (s: string): ParseResult => {
  const chunker = new RegExp(
    '(' + RE_BAREWORD + '|' + RE_SINGLE_QUOTE + '|' + RE_DOUBLE_QUOTE + ')*',
    'g',
  );

  const chunks = (s.match(chunker) || []).filter(Boolean);
  const result: ParseResult = { values: [] };

  for (let i = 0; i < chunks.length; i++) {
    const { value, comment } = parseChunk(chunks, i);

    if (value !== undefined) {
      result.values.push(value);
    }

    if (comment) {
      result.comment = comment;
      break;
    }
  }

  return result;
};

export default unquoteWord;
export { unquoteWord };
