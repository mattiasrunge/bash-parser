/**
 * Brace expansion, as bash's braces.c does it: `a{b,c}d` is `abd acd`,
 * `{1..5}` and `{a..e}` are sequences, `{01..10..3}` one with a step and its
 * zeros. It is the first expansion and works on the word as written: a brace
 * or a comma that is quoted, escaped or inside `${ }`, `$( )`, `$(( ))` or
 * backquotes does not count, and a brace with nothing to expand stays as it is.
 */

/** Where the construct starting at `text[i]` ends: past a quote, an escape or an expansion. */
function skip(text: string, i: number): number {
  const c = text[i];

  if (c === '\\') return i + 2;

  if (c === "'") {
    const close = text.indexOf("'", i + 1);
    return close === -1 ? text.length : close + 1;
  }

  if (c === '`') {
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === '`') return j + 1;
    }
    return text.length;
  }

  if (c === '"') {
    for (let j = i + 1; j < text.length;) {
      if (text[j] === '"') return j + 1;
      j = text[j] === '\\' ? j + 2 : text[j] === '$' || text[j] === '`' ? skip(text, j) : j + 1;
    }
    return text.length;
  }

  if (c === '$' && (text[i + 1] === '{' || text[i + 1] === '(')) {
    const open = text[i + 1];
    const close = open === '{' ? '}' : ')';
    let depth = 0;

    for (let j = i + 1; j < text.length;) {
      if (text[j] === open) depth++;
      else if (text[j] === close && --depth === 0) return j + 1;

      j = text[j] === open || text[j] === close ? j + 1 : '\'"`\\$'.includes(text[j]) ? skip(text, j) : j + 1;
    }

    return text.length;
  }

  if (c === '$' && text[i + 1] === "'") {
    for (let j = i + 2; j < text.length; j++) {
      if (text[j] === '\\') j++;
      else if (text[j] === "'") return j + 1;
    }
    return text.length;
  }

  return i + 1;
}

/**
 * The `}` that closes the `{` at `open`, and the top-level commas between
 * them; undefined when there is none.
 */
function braceBody(text: string, open: number): { close: number; commas: number[] } | undefined {
  let depth = 0;
  const commas: number[] = [];

  for (let i = open; i < text.length;) {
    const c = text[i];

    if (c === '{') {
      depth++;
    } else if (c === '}') {
      if (--depth === 0) return { close: i, commas };
    } else if (c === ',' && depth === 1) {
      commas.push(i);
    } else if ('\'"`\\$'.includes(c)) {
      const next = skip(text, i);

      if (next > i + 1) {
        i = next;
        continue;
      }
    }

    i++;
  }

  return undefined;
}

/** `{x..y}` and `{x..y..step}`: the words, or undefined when the body is no sequence. */
function sequence(body: string): string[] | undefined {
  const numeric = body.match(/^([+-]?\d+)\.\.([+-]?\d+)(?:\.\.([+-]?\d+))?$/);

  if (numeric) {
    const [, from, to, stepText] = numeric;
    const start = BigInt(from);
    const end = BigInt(to);
    let step = stepText === undefined ? 1n : BigInt(stepText);

    if (step < 0n) step = -step;
    if (step === 0n) step = 1n;

    // A leading zero on either end pads every number to the longer one's width
    const padded = /^[+-]?0\d/.test(from) || /^[+-]?0\d/.test(to);
    const width = padded ? Math.max(from.length, to.length) : 0;
    const words: string[] = [];

    for (let n = start; start <= end ? n <= end : n >= end; n += start <= end ? step : -step) {
      const digits = (n < 0n ? -n : n).toString();

      words.push(n < 0n ? `-${digits.padStart(width - 1, '0')}` : digits.padStart(width, '0'));

      if (words.length > 1_000_000) break;
    }

    return words;
  }

  const letters = body.match(/^([a-zA-Z])\.\.([a-zA-Z])(?:\.\.([+-]?\d+))?$/);

  if (letters) {
    const [, from, to, stepText] = letters;
    const start = from.charCodeAt(0);
    const end = to.charCodeAt(0);
    let step = stepText === undefined ? 1 : Math.abs(Number(stepText)) || 1;

    if (step === 0) step = 1;

    const words: string[] = [];

    for (let n = start; start <= end ? n <= end : n >= end; n += start <= end ? step : -step) {
      words.push(String.fromCharCode(n));
    }

    return words;
  }

  return undefined;
}

/**
 * The words a word becomes, each with where its characters came from in the
 * word: `map[k]` is the offset of the new word's character `k`, so what
 * points into the word — an expansion's location — can follow it.
 */
export function braceExpandMapped(text: string): { text: string; map: number[] }[] {
  const char = (i: number) => (i < 0 ? String.fromCharCode(-1 - i) : text[i]);

  return expand(Array.from({ length: text.length }, (_, i) => i)).map((indices) => ({ text: indices.map(char).join(''), map: indices }));

  function expand(indices: number[]): number[][] {
    const view = indices.map(char).join('');

    for (let i = 0; i < view.length;) {
      const c = view[i];

      if (c !== '{') {
        i = '\'"`\\$'.includes(c) ? Math.max(skip(view, i), i + 1) : i + 1;
        continue;
      }

      const body = braceBody(view, i);

      if (!body) {
        i++;
        continue;
      }

      const preamble = indices.slice(0, i);
      const postamble = indices.slice(body.close + 1);
      let alternatives: number[][] | undefined;

      if (body.commas.length > 0) {
        const bounds = [i, ...body.commas, body.close];

        alternatives = bounds.slice(0, -1).map((start, n) => indices.slice(start + 1, bounds[n + 1]));
      } else {
        // A sequence's words are new text, from nowhere in the word
        alternatives = sequence(view.slice(i + 1, body.close))?.map((word) => [...word].map((char) => -1 - char.charCodeAt(0)));
      }

      // `{x}`, `{}`: nothing to expand here; look on inside and after it
      if (!alternatives) {
        i++;
        continue;
      }

      // Each alternative may hold braces of its own, and so may what follows
      const tails = expand(postamble);

      return alternatives.flatMap((alternative) =>
        (alternative.some((index) => index < 0) ? [alternative] : expand(alternative)).flatMap((middle) => tails.map((tail) => [...preamble, ...middle, ...tail]))
      );
    }

    return [indices];
  }
}

/** The words a word becomes. A word without braces to expand is itself. */
export function braceExpand(text: string): string[] {
  return braceExpandMapped(text).map((word) => word.text);
}
