import type { LexerPhase } from '../../../lexer/types.ts';
import { mkToken, type TokenIf } from '../../../tokenizer/mod.ts';

type Frame = { state: 'subject' | 'patterns' | 'body' };

/** `b` begins where `a` ends: nothing, not even a blank, between them. */
const touching = (a: TokenIf, b: TokenIf) => a.loc?.end?.char !== undefined && b.loc?.start?.char === a.loc.end.char + 1;

/** One word from two that touch, the second's expansions moved to where it now starts. */
const join = (a: TokenIf, b: TokenIf): TokenIf => {
  const offset = b.loc!.start!.char! - a.loc!.start!.char!;
  const moved = (b.expansion ?? []).map((xp) => ({ ...xp, loc: xp.loc && { start: xp.loc.start! + offset, end: xp.loc.end! + offset } }));

  return mkToken('WORD', a.value + b.value, {
    loc: { start: a.loc!.start, end: b.loc!.end },
    expansion: [...(a.expansion ?? []), ...moved],
    ctx: { ...a.ctx, pattern: true },
  });
};

const asPattern = (token: TokenIf): TokenIf => mkToken('WORD', token.value, { loc: token.loc, expansion: token.expansion, ctx: { ...token.ctx, pattern: true } });

/**
 * The patterns of a `case` item, `a*|"lit"|@(x|y))`. Each one is marked as a
 * pattern, so quote removal leaves it to the executor, which has to know what
 * was quoted to match it literally. An extended pattern the tokenizer split at
 * its parentheses and bars is put back together: in `*.@(c|h))` only the last
 * `)` ends the item.
 */
const casePatterns: LexerPhase = () =>
  async function* (tokens: AsyncIterable<TokenIf>) {
    const frames: Frame[] = [];
    // The pattern being put together, and how deep in its parentheses it is
    let pattern: TokenIf | undefined;
    let depth = 0;
    // After a pattern list's `(` or a `|`, the next word is a pattern whatever it reads: `(esac)`
    let patternNext = false;

    for await (const token of tokens) {
      const frame = frames[frames.length - 1];

      if (pattern) {
        const inside = depth > 0 || !(token.is('CLOSE_PAREN') || token.is('PIPE'));

        if (touching(pattern, token) && inside) {
          if (token.is('OPEN_PAREN')) depth++;
          if (token.is('CLOSE_PAREN')) depth--;

          pattern = join(pattern, token);
          continue;
        }

        yield pattern;
        pattern = undefined;
        depth = 0;
      }

      if (token.is('Case')) {
        frames.push({ state: 'subject' });
      } else if (frame?.state === 'subject' && (token.is('In') || token.is('LINEBREAK_IN'))) {
        frame.state = 'patterns';
      } else if (frame?.state === 'patterns') {
        // `esac` where a pattern list could start ends the case, even right after `in`
        if ((token.is('Esac') || (token.is('WORD') && token.value === 'esac')) && !patternNext) {
          frames.pop();
          yield token.is('Esac') ? token : token.setType('Esac');
          continue;
        } else if (token.is('CLOSE_PAREN')) {
          frame.state = 'body';
        } else if (token.is('PIPE') || token.is('OPEN_PAREN')) {
          patternNext = true;
          yield token;
          continue;
        } else if (!token.is('NEWLINE') && !token.is('NEWLINE_LIST')) {
          pattern = asPattern(token);
          patternNext = false;
          continue;
        }
      } else if (frame?.state === 'body') {
        if (token.is('DSEMI') || token.is('SEMI_AND') || token.is('DSEMI_AND')) {
          frame.state = 'patterns';
        } else if (token.is('Esac')) {
          frames.pop();
        }
      }

      yield token;
    }

    if (pattern) {
      yield pattern;
    }
  };

export default casePatterns;
