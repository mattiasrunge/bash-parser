/**
 * Where a command substitution ends.
 *
 * Bash finds the `)` that closes `$(` by parsing what is inside, and so the
 * text may hold anything a script can: a `case` whose patterns end in `)`,
 * a comment or a quoted string with a `)` in it, a here-document whose body
 * does. Counting parentheses cannot see those. This reads just enough of the
 * shell's syntax to step over each of them.
 */

/** Words after which the next word stands where a command starts. */
const COMMAND_STARTERS = new Set(['then', 'do', 'else', 'elif', 'if', 'while', 'until', '{', '!', 'time', 'coproc']);

type Case = { phase: 'subject' | 'patterns' | 'body' };

const isBlank = (c: string | undefined) => c === ' ' || c === '\t';
const isMeta = (c: string | undefined) => c === undefined || /[\s;&|()<>]/.test(c);

/**
 * The index in `text` of the `)` that closes a command substitution whose
 * body starts at `from`, or -1 when the text ends first.
 */
export function substitutionEnd(text: string, from = 0): number {
  let i = from;
  let depth = 0;
  const cases: Case[] = [];
  // Here-documents whose bodies start after the current line
  const pendingDocs: { delimiter: string; strip: boolean }[] = [];
  // Whether the next word stands where a command starts, and whether it is
  // a case pattern whatever it reads (after a pattern list's `(` or a `|`)
  let commandStart = true;
  let patternNext = false;

  try {
    while (i < text.length) {
      const c = text[i];
      const topCase = cases[cases.length - 1];

      if (c === '\\') {
        i += 2;
        commandStart = false;
        continue;
      }

      if (c === '\n') {
        i++;
        commandStart = true;

        // The bodies of the here-documents begun on this line
        for (const doc of pendingDocs.splice(0)) {
          i = hereDocumentEnd(text, i, doc.delimiter, doc.strip);
        }
        continue;
      }

      if (isBlank(c)) {
        i++;
        continue;
      }

      if (c === '#' && (i === from || isMeta(text[i - 1]))) {
        const newline = text.indexOf('\n', i);

        i = newline === -1 ? text.length : newline;
        continue;
      }

      if (c === ')') {
        if (topCase?.phase === 'patterns') {
          topCase.phase = 'body';
          commandStart = true;
          i++;
          continue;
        }

        if (depth === 0) {
          return i;
        }

        depth--;
        i++;
        commandStart = false;
        continue;
      }

      if (c === '(') {
        // A case pattern may start with one of its own
        if (topCase?.phase === 'patterns') {
          patternNext = true;
        } else {
          depth++;
        }

        i++;
        commandStart = true;
        continue;
      }

      if (c === ';' || c === '&' || c === '|') {
        const two = text.slice(i, i + 2);
        const three = text.slice(i, i + 3);

        if (topCase?.phase === 'body' && (three === ';;&' || two === ';;' || two === ';&')) {
          topCase.phase = 'patterns';
          i += three === ';;&' ? 3 : 2;
        } else {
          i += two === '&&' || two === '||' || two === ';;' ? 2 : 1;
        }

        patternNext = topCase?.phase === 'patterns' && c === '|';
        commandStart = true;
        continue;
      }

      if (c === '<' && text[i + 1] === '<' && text[i + 2] !== '<') {
        // `<<` or `<<-`, then the delimiter word
        const strip = text[i + 2] === '-';

        i += strip ? 3 : 2;
        while (isBlank(text[i])) i++;

        const start = i;

        i = wordEnd(text, i);
        pendingDocs.push({ delimiter: text.slice(start, i).replace(/\\(.)/g, '$1').replace(/['"]/g, ''), strip });
        commandStart = false;
        continue;
      }

      if (c === '<' || c === '>') {
        i++;
        continue;
      }

      // A word: read it whole, stepping over what it quotes and expands
      const start = i;

      i = wordEnd(text, i);

      const word = text.slice(start, i);

      if (commandStart && word === 'case') {
        cases.push({ phase: 'subject' });
      } else if (topCase?.phase === 'subject' && word === 'in') {
        topCase.phase = 'patterns';
      } else if (word === 'esac' && topCase && !patternNext && (topCase.phase === 'patterns' || commandStart)) {
        cases.pop();
      }

      patternNext = false;

      commandStart = commandStart && COMMAND_STARTERS.has(word);
    }
  } catch (err) {
    if (err instanceof Incomplete) return -1;
    throw err;
  }

  return -1;
}

class Incomplete extends Error {}

/**
 * The index in `text` of the `}` that closes a parameter expansion whose text
 * starts at `from` (just after `\${`), or -1 when the text ends first. Quotes
 * and nested expansions are stepped over: `\${x:-"}"}`, `\${x:-$(echo })}`.
 */
export function parameterExpansionEnd(text: string, from = 0, posixDoubleQuoted = false): number {
  try {
    return braceEnd(text, from, posixDoubleQuoted);
  } catch (err) {
    if (err instanceof Incomplete) return -1;
    throw err;
  }
}

/** The end of the word starting at `i`: past quotes, escapes and expansions, up to a blank or an operator. */
function wordEnd(text: string, i: number): number {
  while (i < text.length && !isMeta(text[i])) {
    i = stepOver(text, i);
  }

  // `@(…)` and friends inside a word are part of it; so is `=(…)`, an array
  while (i < text.length && text[i] === '(' && /[@*+?!=]$/.test(text.slice(0, i))) {
    const close = parenEnd(text, i);

    if (close === -1) throw new Incomplete();
    i = close + 1;

    while (i < text.length && !isMeta(text[i])) {
      i = stepOver(text, i);
    }
  }

  return i;
}

/** Past one character of a word, or past the whole quoted string or expansion that starts there. */
function stepOver(text: string, i: number): number {
  const c = text[i];

  if (c === '\\') return i + 2;
  if (c === "'") return closeOf(text.indexOf("'", i + 1));
  if (c === '"') return doubleQuotedEnd(text, i + 1) + 1;
  if (c === '`') return backtickEnd(text, i + 1) + 1;

  if (c === '$') {
    const next = text[i + 1];

    if (next === "'") return ansiEnd(text, i + 2) + 1;
    if (next === '"') return doubleQuotedEnd(text, i + 2) + 1;
    if (next === '{') return braceEnd(text, i + 2) + 1;
    if (next === '(') {
      const close = substitutionEnd(text, i + 2);

      if (close === -1) throw new Incomplete();
      return close + 1;
    }
  }

  return i + 1;
}

function closeOf(index: number): number {
  if (index === -1) throw new Incomplete();
  return index + 1;
}

/** The closing `"` of a double-quoted string whose text starts at `i`. */
function doubleQuotedEnd(text: string, i: number): number {
  while (i < text.length) {
    const c = text[i];

    if (c === '"') return i;
    if (c === '\\') i += 2;
    else if (c === '$' || c === '`') i = stepOver(text, i);
    else i++;
  }

  throw new Incomplete();
}

function backtickEnd(text: string, i: number): number {
  while (i < text.length) {
    if (text[i] === '\\') i += 2;
    else if (text[i] === '`') return i;
    else i++;
  }

  throw new Incomplete();
}

function ansiEnd(text: string, i: number): number {
  while (i < text.length) {
    if (text[i] === '\\') i += 2;
    else if (text[i] === "'") return i;
    else i++;
  }

  throw new Incomplete();
}

/** What may follow the name in `${name…}`: an operator's characters. */
const OPERATOR_CHARS = '#%^,~:-=?+/';

/**
 * The `}` closing a `${` whose text starts at `i`: the first one not quoted
 * and not closing a nested expansion — bash does not pair plain braces, so
 * `${x:-a { b } c}` ends after `b `.
 *
 * `posixDoubleQuoted`: the expansion stands inside double quotes in POSIX
 * mode, where a `'` quotes only in the pattern of `#`, `%`, `/`, `^` and `,`
 * — `"${x+'}"` ends at the first `}`. Bash's parse_matched_pair follows the
 * operator the same way (its dolbrace_state).
 */
function braceEnd(text: string, i: number, posixDoubleQuoted = false): number {
  const start = i;
  let state: 'param' | 'op' | 'word' | 'pattern' = 'param';

  while (i < text.length) {
    const c = text[i];

    if (c === '}') return i;

    if (posixDoubleQuoted) {
      if (state === 'param' && i > start && '%#^,/'.includes(c)) state = 'pattern';
      else if (state === 'param' && OPERATOR_CHARS.includes(c)) state = 'op';
      else if (state === 'op' && !OPERATOR_CHARS.includes(c)) state = 'word';

      if (c === "'" && state !== 'pattern') {
        i++;
        continue;
      }

      if (c === '$' && text[i + 1] === '{') {
        i = braceEnd(text, i + 2, true) + 1;
        continue;
      }
    }

    if (c === '\\' || c === "'" || c === '"' || c === '`' || c === '$') {
      i = stepOver(text, i);
    } else {
      i++;
    }
  }

  throw new Incomplete();
}

/** The `)` closing a `(` at `i` inside a word, as in `@(a|b)`. */
function parenEnd(text: string, i: number): number {
  let depth = 0;

  while (i < text.length) {
    const c = text[i];

    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;

    i = c === '(' || c === ')' ? i + 1 : stepOver(text, i);
  }

  return -1;
}

/** Past the body of a here-document that starts at `i`: the index after its closing line. */
function hereDocumentEnd(text: string, i: number, delimiter: string, strip: boolean): number {
  while (i < text.length) {
    const newline = text.indexOf('\n', i);
    const line = text.slice(i, newline === -1 ? text.length : newline);

    // A closing line may also be where the substitution ends, `EOF)`: bash accepts that
    const closing = strip ? line.replace(/^\t+/, '') : line;

    if (closing === delimiter) {
      return newline === -1 ? text.length : newline + 1;
    }

    if (closing.startsWith(delimiter) && closing.slice(delimiter.length).trimStart().startsWith(')')) {
      return i + line.indexOf(delimiter) + delimiter.length;
    }

    if (newline === -1) break;
    i = newline + 1;
  }

  throw new Incomplete();
}

/**
 * Where a scan of the source ahead ends, reading only as much of it as it
 * takes: the scanners answer -1 when the text ends first, so a short stretch
 * is tried first and a longer one only then. Joining all the rest of a large
 * script for every `${` and `$(` in it made parsing it quadratic.
 */
export function scanAhead(first: string, source: string[], scan: (text: string) => number): number {
  for (let size = 256;; size *= 4) {
    const end = scan(first + source.slice(0, size).join(''));

    if (end !== -1 || size >= source.length) return end;
  }
}
