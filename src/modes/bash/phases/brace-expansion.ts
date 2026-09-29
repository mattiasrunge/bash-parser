import type { LexerPhase } from '../../../lexer/types.ts';
import type { TokenIf } from '../../../tokenizer/mod.ts';
import { ARRAY_ELEMENT_SEPARATOR, parseAssignmentWord } from '../../../utils/assignment.ts';
import type { Expansion } from '../../../tokenizer/mod.ts';
import { braceExpand, braceExpandMapped } from '../../../utils/brace-expansion.ts';

/**
 * A word's expansions, moved to where their text went in one of the words
 * brace expansion made of it; one whose text is not there, whole and in order,
 * is not in that word.
 */
const moveExpansions = (expansions: Expansion[] | undefined, map: number[]): Expansion[] => {
  const moved: Expansion[] = [];

  for (const xp of expansions ?? []) {
    if (!xp.loc) continue;

    const start = map.indexOf(xp.loc.start!);
    const length = xp.loc.end! - xp.loc.start!;

    if (start !== -1 && map[start + length] === xp.loc.end && map.slice(start, start + length + 1).every((index, k) => index === xp.loc!.start! + k)) {
      moved.push({ ...xp, loc: { start, end: start + length } });
    }
  }

  return moved;
};

/** Operators whose word is a file, which brace expansion leaves alone. */
const REDIRECTIONS = ['LESS', 'GREAT', 'DGREAT', 'LESSAND', 'GREATAND', 'LESSGREAT', 'CLOBBER', 'DLESS', 'DLESSDASH', 'TLESS', 'AND_GREAT', 'AND_DGREAT'];

/**
 * Brace expansion, the first of the expansions: a word with `{a,b}` or
 * `{1..3}` in it becomes the words it stands for, each read on from here as
 * any word is. A pattern — a `case` label, the right side of `[[ == ]]` — and
 * a redirection's file are left as written, and so is an assignment, but for
 * the elements of an array literal: `a=({1..3})`.
 */
const braceExpansion: LexerPhase = () =>
  async function* (tokens: AsyncIterable<TokenIf>) {
    let previous: TokenIf | undefined;

    for await (const token of tokens) {
      const redirected = previous !== undefined && REDIRECTIONS.some((type) => previous!.is(type));

      previous = token;

      if (token.is('WORD') && !token.ctx.pattern && !redirected && token.value!.includes('{')) {
        const words = braceExpandMapped(token.value!);

        if (words.length !== 1 || words[0].text !== token.value) {
          for (const word of words) {
            yield token.setValue(word.text).setExpansion(moveExpansions(token.expansion, word.map));
          }

          continue;
        }
      }

      if (token.is('ASSIGNMENT_WORD') && token.value!.includes('{')) {
        const parts = parseAssignmentWord(token.value!);

        if (parts?.list) {
          const elements = parts.value.split(ARRAY_ELEMENT_SEPARATOR).flatMap((element) => (element === '' ? [element] : braceExpand(element)));

          yield token.setValue(`${token.value!.slice(0, parts.valueStart)}${elements.join(ARRAY_ELEMENT_SEPARATOR)})`);
          continue;
        }
      }

      yield token;
    }
  };

export default braceExpansion;
