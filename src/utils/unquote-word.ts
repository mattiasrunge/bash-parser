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
const ANSI_C_ESCAPES: Record<string, string> = {
  a: '\x07',
  b: '\b',
  e: '\x1B',
  E: '\x1B',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  '\\': '\\',
  "'": "'",
  '"': '"',
  '?': '?',
};

/**
 * Decode the body of an ANSI-C quoted string, `$'a\nb'`.
 *
 * @param text - The chunk being parsed
 * @param start - Index of the opening quote
 * @returns The decoded text and the index of the closing quote
 */
const parseAnsiC = (text: string, start: number): { value: string; end: number } => {
  let value = '';
  let i = start + 1;

  while (i < text.length && text.charAt(i) !== "'") {
    const c = text.charAt(i);

    if (c !== '\\') {
      value += c;
      i++;
      continue;
    }

    const next = text.charAt(i + 1);

    if (next in ANSI_C_ESCAPES) {
      value += ANSI_C_ESCAPES[next];
      i += 2;
    } else if (next === 'x' || next === 'u' || next === 'U') {
      const digits = next === 'x' ? 2 : next === 'u' ? 4 : 8;
      const hex = text.slice(i + 2, i + 2 + digits).match(/^[0-9A-Fa-f]+/)?.[0] ?? '';

      if (hex === '') {
        value += next;
        i += 2;
      } else {
        value += String.fromCodePoint(Number.parseInt(hex, 16));
        i += 2 + hex.length;
      }
    } else if (next >= '0' && next <= '7') {
      const octal = text.slice(i + 1, i + 4).match(/^[0-7]+/)![0];

      value += String.fromCodePoint(Number.parseInt(octal, 8));
      i += 1 + octal.length;
    } else {
      value += '\\';
      i++;
    }
  }

  return { value, end: i };
};

const parseChunk = (chunks: string[], idx: number): SingleParseResult => {
  const chunk = chunks[idx];
  const result: SingleParseResult = { value: '' };

  let currentQuote: string | null = null;
  let isEscaped = false;

  for (let i = 0, len = chunk.length; i < len; i++) {
    let c = chunk.charAt(i);

    if (!isEscaped && !currentQuote && c === '$' && chunk.charAt(i + 1) === "'") {
      // ANSI-C quoting: the escapes are decoded, the result is literal
      const ansi = parseAnsiC(chunk, i + 1);

      // Doubled so the unescape() that follows quote removal leaves it alone
      result.value += ansi.value.replace(/\\/g, '\\\\');
      i = ansi.end;
      continue;
    }

    if (isEscaped) {
      result.value += c;
      isEscaped = false;
    } else if (currentQuote) {
      if (c === currentQuote) {
        currentQuote = null;
      } else if (currentQuote === SINGLE_QUOTE) {
        // Single-quoted text is fully literal in bash. The quote-removal phase
        // runs unescape() on the result afterwards (which gives double quotes
        // their \n, \t handling), and that would wrongly transform backslash
        // sequences that were single-quoted (e.g. '\1' -> 0x01). Double every
        // backslash here so the later unescape collapses it back to one literal
        // backslash, leaving single-quoted content untouched.
        result.value += c === BACKSLASH ? BACKSLASH + BACKSLASH : c;
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
