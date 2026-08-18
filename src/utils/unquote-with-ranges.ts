import type { ProtectedRange } from '../tokenizer/types.ts';
import unquoteWord, { type ParseResult } from './unquote-word.ts';

// Placeholder characters that are unlikely to appear in shell input
// Used to temporarily escape quotes in protected ranges
const DOUBLE_QUOTE_PLACEHOLDER = '\x00DQ\x00';
const SINGLE_QUOTE_PLACEHOLDER = '\x00SQ\x00';
const BACKSLASH_PLACEHOLDER = '\x00BS\x00';

/**
 * Shell metacharacters, and the placeholders that hide them from quote removal.
 *
 * unquoteWord's chunker treats these as word terminators and drops them (that is what
 * makes `a > b` three tokens), which is right for command syntax and wrong for anything
 * that came out of an expansion: `A='x>y'; echo $A` printed `x y` instead of `x>y`.
 * Operators are recognised when the input is tokenized, not again on the result of an
 * expansion, so protected content has to survive that pass intact.
 *
 * Whitespace is deliberately not in here — field splitting on it still has to happen.
 */
const META_PLACEHOLDERS: [string, string][] = [
  ['|', '\x00PI\x00'],
  ['&', '\x00AM\x00'],
  [';', '\x00SC\x00'],
  ['(', '\x00OP\x00'],
  [')', '\x00CP\x00'],
  ['<', '\x00LT\x00'],
  ['>', '\x00GT\x00'],
];

/** The value of IFS a shell starts with: space, tab, newline. */
export const DEFAULT_IFS = ' \t\n';

/**
 * A field boundary that survives quote removal.
 *
 * `"${arr[@]}"` and `"$@"` produce one field per element even though the whole
 * expansion is quoted, so the splitter cannot derive those boundaries from IFS
 * or from the quoting. The caller substitutes this marker between the elements
 * and it always splits.
 */
export const FIELD_MARKER = '\x00\x01\x00';

/** A character of IFS that is whitespace: runs of it collapse into one delimiter. */
const IFS_WHITESPACE_PLACEHOLDER = '\x00IW\x00';

/** A character of IFS that is not whitespace: each occurrence delimits a field. */
const IFS_DELIMITER_PLACEHOLDER = '\x00ID\x00';

/** Whitespace from an expansion that IFS does not split on, hidden from the chunker. */
// Built from a string, like the placeholders above: a literal regex with control
// characters in it trips the no-control-regex lint
const LITERAL_WHITESPACE_RE = new RegExp('\x00WS([0-9]+)\x00', 'g');
const literalWhitespace = (char: string) => `\x00WS${char.charCodeAt(0)}\x00`;

const WHITESPACE = ' \t\n\r\v\f';

/**
 * Mark the field boundaries IFS puts inside expansion output.
 *
 * Field splitting applies to what an expansion produced, never to the literal
 * text around it — with `IFS=:` the word `a:b` is one field while `$V` holding
 * `a:b` is two. unquoteWord's chunker cannot make that distinction (it splits
 * the whole word on whitespace), so IFS characters are turned into markers here
 * and the actual split happens after quote removal, in splitFields().
 *
 * Whitespace that IFS does *not* contain is hidden behind a placeholder for the
 * same reason: the chunker would otherwise split on it anyway.
 */
const markFieldSeparators = (content: string, ifs: string): string => {
  let marked = '';

  for (const char of content) {
    if (ifs.includes(char)) {
      marked += WHITESPACE.includes(char) ? IFS_WHITESPACE_PLACEHOLDER : IFS_DELIMITER_PLACEHOLDER;
    } else if (WHITESPACE.includes(char)) {
      marked += literalWhitespace(char);
    } else {
      marked += char;
    }
  }

  return marked;
};

/**
 * Escape quote characters in protected content with placeholders.
 * This prevents them from being processed during quote removal.
 *
 * Whitespace is dealt with by markFieldSeparators() before this runs, when the
 * range is subject to field splitting. A quoted range keeps its whitespace as
 * is — the quotes around it already stop the chunker from splitting there.
 */
const escapeProtectedContent = (content: string): string => {
  let escaped = content
    .replace(/\\/g, BACKSLASH_PLACEHOLDER)
    .replace(/"/g, DOUBLE_QUOTE_PLACEHOLDER)
    .replace(/'/g, SINGLE_QUOTE_PLACEHOLDER);

  for (const [char, placeholder] of META_PLACEHOLDERS) {
    escaped = escaped.split(char).join(placeholder);
  }

  return escaped;
};

/**
 * Restore placeholders to their original characters.
 */
const restorePlaceholders = (text: string): string => {
  let restored = text
    .replace(new RegExp(BACKSLASH_PLACEHOLDER, 'g'), '\\')
    .replace(new RegExp(DOUBLE_QUOTE_PLACEHOLDER, 'g'), '"')
    .replace(new RegExp(SINGLE_QUOTE_PLACEHOLDER, 'g'), "'");

  for (const [char, placeholder] of META_PLACEHOLDERS) {
    restored = restored.split(placeholder).join(char);
  }

  return restored.replace(LITERAL_WHITESPACE_RE, (_, code) => String.fromCharCode(Number(code)));
};

/**
 * The ranges that fall inside [start, end), rebased on start.
 *
 * For unquoting one piece of a word (an array literal element) with the ranges
 * that were recorded for the word as a whole.
 */
export const sliceRanges = (ranges: ProtectedRange[], start: number, end: number): ProtectedRange[] =>
  ranges
    .filter((range) => range.end > start && range.start < end)
    .map((range) => ({ start: Math.max(range.start, start) - start, end: Math.min(range.end, end) - start }));

/**
 * Which protected ranges sit inside quotes, and are therefore not field split.
 *
 * The quote state is read from the literal text only: quotes that came out of an
 * expansion are data, not syntax, so each range is skipped over as a unit.
 */
const quotedRanges = (text: string, ranges: ProtectedRange[]): boolean[] => {
  const quoted: boolean[] = [];

  let inSingle = false;
  let inDouble = false;
  let isEscaped = false;
  let next = 0;

  for (let i = 0; i < text.length; i++) {
    if (next < ranges.length && i === ranges[next].start) {
      quoted[next] = inSingle || inDouble;
      i = ranges[next].end - 1;
      next++;
      continue;
    }

    const char = text[i];

    if (isEscaped) {
      isEscaped = false;
    } else if (char === '\\' && !inSingle) {
      isEscaped = true;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    }
  }

  // Ranges at the very end of the text are not reached by the loop above
  for (let i = next; i < ranges.length; i++) {
    quoted[i] = inSingle || inDouble;
  }

  return quoted;
};

/**
 * POSIX field splitting.
 *
 * A run of IFS whitespace is one delimiter; an IFS character that is not
 * whitespace delimits on its own, so `a::b` with `IFS=:` has an empty field in
 * the middle; whitespace around such a character is absorbed into it. Leading
 * and trailing whitespace runs produce no fields, and an empty IFS disables
 * splitting altogether.
 *
 * @param text - The text to split
 * @param ifs - The field separators
 * @param whitespace - Which characters count as whitespace, for callers that
 *                     split on stand-in markers rather than on real characters
 */
export const splitByIfs = (text: string, ifs: string, whitespace: string = WHITESPACE): string[] => {
  if (text === '') {
    return [];
  }

  if (ifs === '') {
    return [text];
  }

  const isWhitespace = (char: string) => ifs.includes(char) && whitespace.includes(char);
  const isDelimiter = (char: string) => ifs.includes(char) && !whitespace.includes(char);

  const fields: string[] = [];
  let current = '';
  let i = 0;

  while (i < text.length && isWhitespace(text[i])) {
    i++;
  }

  while (i < text.length) {
    const char = text[i];

    if (!isWhitespace(char) && !isDelimiter(char)) {
      current += char;
      i++;
      continue;
    }

    // One delimiter is `whitespace* separator? whitespace*`
    let sawDelimiter = isDelimiter(char);
    let end = i + 1;

    while (end < text.length && (isWhitespace(text[end]) || (!sawDelimiter && isDelimiter(text[end])))) {
      sawDelimiter = sawDelimiter || isDelimiter(text[end]);
      end++;
    }

    if (end >= text.length && !sawDelimiter) {
      // Trailing whitespace closes the last field without opening another
      break;
    }

    fields.push(current);
    current = '';
    i = end;

    if (i >= text.length) {
      return fields;
    }
  }

  if (current !== '') {
    fields.push(current);
  }

  return fields;
};

/**
 * Split one quote-removed value on the markers left by markFieldSeparators().
 */
const splitFields = (value: string): string[] => {
  if (!value.includes(IFS_WHITESPACE_PLACEHOLDER) && !value.includes(IFS_DELIMITER_PLACEHOLDER)) {
    return [value];
  }

  // The markers are multi-character, so they are reduced to one character each
  // before splitting — the algorithm is the same, on a two-character IFS
  const marked = value
    .split(IFS_WHITESPACE_PLACEHOLDER).join('\x02')
    .split(IFS_DELIMITER_PLACEHOLDER).join('\x03');

  return splitByIfs(marked, '\x02\x03', '\x02');
};

/**
 * Unquote a string, removing bash quote characters.
 */
export const unquote = (text: string): string => {
  const result = unquoteWord(text);

  if (result.values.length === 0) {
    return text;
  }

  if (result.comment) {
    return '';
  }

  return result.values[0];
};

/**
 * Unquote text while preserving protected ranges (content from expansions).
 * Returns a single string (first word only if there's word splitting).
 *
 * @param text - The text to unquote
 * @param protectedRanges - Ranges that should not have quote removal applied
 * @returns The unquoted text with protected ranges preserved (first word only)
 */
export const unquoteWithProtectedRanges = (text: string, protectedRanges: ProtectedRange[]): string => {
  const result = unquoteWordWithProtectedRanges(text, protectedRanges);
  if (result.values.length === 0) {
    return text;
  }
  return result.values[0];
};

/**
 * Unquote text while preserving protected ranges (content from expansions).
 * Returns all words (preserves word splitting behavior).
 *
 * This follows POSIX shell semantics where quote removal only applies to
 * characters that were part of the original command syntax, not characters
 * that resulted from parameter/command/arithmetic expansion.
 *
 * Strategy: temporarily replace quote characters in protected ranges with
 * placeholders, run normal unquoteWord, then restore the placeholders.
 * Word splitting still occurs on whitespace.
 *
 * @param text - The text to unquote
 * @param protectedRanges - Ranges that should not have quote removal applied
 * @param ifs - The field separators to split expansion output on, defaults to space/tab/newline
 * @returns ParseResult with unquoted values, preserving protected range content
 */
export const unquoteWordWithProtectedRanges = (text: string, protectedRanges: ProtectedRange[], ifs: string = DEFAULT_IFS): ParseResult => {
  if (!protectedRanges || protectedRanges.length === 0) {
    const result = unquoteWord(text);
    return {
      values: result.values,
      comment: result.comment,
    };
  }

  const ascendingRanges = [...protectedRanges].sort((a, b) => a.start - b.start);
  const quoted = quotedRanges(text, ascendingRanges);

  // Replace from end to start so earlier positions stay valid
  let escaped = text;
  for (let i = ascendingRanges.length - 1; i >= 0; i--) {
    const range = ascendingRanges[i];
    const content = escaped.slice(range.start, range.end);
    const split = quoted[i] ? content : markFieldSeparators(content, ifs);
    escaped = escaped.slice(0, range.start) + escapeProtectedContent(split) + escaped.slice(range.end);
  }

  // Run normal unquoteWord
  const result = unquoteWord(escaped);

  const values: string[] = [];
  for (const value of result.values) {
    for (const field of splitFields(value)) {
      // A marked boundary splits whatever the quoting was, so it is applied last
      values.push(...field.split(FIELD_MARKER).map(restorePlaceholders));
    }
  }

  return { values, comment: result.comment };
};

/**
 * Remove shell quotes without word splitting.
 * Used for assignment values where POSIX forbids field splitting.
 */
const removeQuotes = (text: string): string => {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (isEscaped) {
      result += c;
      isEscaped = false;
    } else if (inSingle) {
      if (c === "'") {
        inSingle = false;
      } else {
        result += c;
      }
    } else if (inDouble) {
      if (c === '"') {
        inDouble = false;
      } else if (c === '\\') {
        const next = text[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          result += next;
          i++;
        } else {
          result += c;
        }
      } else {
        result += c;
      }
    } else if (c === "'") {
      inSingle = true;
    } else if (c === '"') {
      inDouble = true;
    } else if (c === '\\') {
      isEscaped = true;
    } else {
      result += c;
    }
  }

  return result;
};

/**
 * Quote removal for assignment values - no word splitting.
 * POSIX: Variable assignments do not undergo field splitting.
 */
export const unquoteAssignmentWithProtectedRanges = (
  text: string,
  protectedRanges: ProtectedRange[],
): string => {
  if (!protectedRanges || protectedRanges.length === 0) {
    return removeQuotes(text);
  }

  const sortedRanges = [...protectedRanges].sort((a, b) => b.start - a.start);

  let escaped = text;
  for (const range of sortedRanges) {
    const content = escaped.slice(range.start, range.end);
    escaped = escaped.slice(0, range.start) + escapeProtectedContent(content) + escaped.slice(range.end);
  }

  return restorePlaceholders(removeQuotes(escaped));
};

export default unquoteWithProtectedRanges;
