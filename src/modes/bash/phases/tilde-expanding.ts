import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import type { Options } from '../../../types.ts';
import type { Expansion } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR } from '../../../utils/assignment.ts';
import map from '../../../utils/iterable/map.ts';

const replace = async (text: string, resolveHomeUser: Options['resolveHomeUser']) => {
  let replaced = false;

  let result = text;
  const regex = /^~([^\/]*)\//;
  const match = text.match(regex);

  if (match) {
    replaced = true;
    const resolved = await resolveHomeUser!(match[1] || null);
    result = text.replace(regex, resolved + '/');
  }

  // console.log({result, replaced})
  if (!replaced) {
    const regex = /^~(.*)$/;
    const match = text.match(regex);

    if (match) {
      const resolved = await resolveHomeUser!(match[1] || null);
      result = text.replace(regex, resolved);
    }
  }

  return result;
};

/** What may follow a `~` and still be a tilde prefix: a login name, `+`, `-`, or a directory stack index. */
const PREFIX = /^(?:[A-Za-z0-9._][A-Za-z0-9._@-]*|[+-]?\d+|[+-])?$/;

/**
 * Where a word's tilde prefixes are, as bash finds them: at its start; in an
 * assignment, and in an argument written like one (`FOO=~/x`), after the `=`
 * and after each `:`; at the start of each element of `a=(…)`. Only an
 * unquoted `~` outside any expansion counts, and its prefix runs to the next
 * `/` (or `:` in an assignment) with nothing quoted or expanded in it.
 */
const tildePrefixes = (text: string, assignment: boolean, taken: { start: number; end: number }[], posix: boolean) => {
  const found: Expansion[] = [];
  const inExpansion = (at: number) => taken.some((loc) => at >= loc.start && at <= loc.end);
  const head = /^[A-Za-z_][A-Za-z0-9_]*(\[[^\]]*\])?\+?=/.exec(text);
  // An argument written like an assignment counts as one, outside posix mode
  const assigns = head !== null && (assignment || !posix);
  const list = assignment && head !== null && text[head[0].length] === '(';
  const stops = list ? `/${ARRAY_ELEMENT_SEPARATOR})` : assigns ? '/:' : '/';
  const candidates = new Set<number>(list ? [head![0].length + 1] : assigns ? [head![0].length] : [0]);
  let quote = '';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = '';
      continue;
    }

    if (c === '\\') {
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }

    if (assigns && !list && c === ':' && !inExpansion(i)) candidates.add(i + 1);
    if (list && c === ARRAY_ELEMENT_SEPARATOR) candidates.add(i + 1);

    if (c !== '~' || !candidates.has(i) || inExpansion(i)) continue;

    let end = i + 1;

    while (end < text.length && !stops.includes(text[end])) end++;

    const prefix = text.slice(i + 1, end);

    if (PREFIX.test(prefix) && !taken.some((loc) => loc.start < end && loc.end >= i)) {
      found.push({ type: 'TildeExpansion', value: prefix, loc: { start: i, end: end - 1 } });
    }
  }

  return found;
};

const tildeExpanding: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    const resolvers = ctx.resolvers as typeof ctx.resolvers & { posix?: boolean };

    if (resolvers.deferTildeExpansion && !resolvers.resolveHomeUser && (token.is('WORD') || token.is('ASSIGNMENT_WORD')) && token.value?.includes('~')) {
      const taken = (token.expansion ?? []).map((xp) => xp.loc).filter((loc): loc is { start: number; end: number } => loc !== undefined);
      const found = tildePrefixes(token.value, token.is('ASSIGNMENT_WORD'), taken, resolvers.posix === true);

      return found.length > 0 ? token.setExpansion([...(token.expansion ?? []), ...found]) : token;
    }

    if (token.is('WORD') && typeof ctx.resolvers.resolveHomeUser === 'function') {
      return token.setValue(await replace(token.value!, ctx.resolvers.resolveHomeUser));
    }

    if (token.is('ASSIGNMENT_WORD') && typeof ctx.resolvers.resolveHomeUser === 'function') {
      // Use indexOf to split only on the first '=' - split('=', 2) doesn't work as expected
      // because the limit just caps returned elements, it doesn't stop splitting early
      const eqIndex = token.value!.indexOf('=');
      const target = token.value!.slice(0, eqIndex);
      const sourceParts = token.value!.slice(eqIndex + 1);

      const resolvedsourceParts = await Promise.all(
        sourceParts
          .split(':')
          .map(async (text: string) => await replace(text, ctx.resolvers.resolveHomeUser!)),
      );

      const source = resolvedsourceParts.join(':');

      return token.setValue(target + '=' + source);
    }

    return token;
  });

export default tildeExpanding;
