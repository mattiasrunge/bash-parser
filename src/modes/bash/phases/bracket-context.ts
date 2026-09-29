import type { LexerPhase } from '../../../lexer/types.ts';
import { mkToken, type TokenIf } from '../../../tokenizer/mod.ts';

/** Tokens after which a word stands where a command starts. */
const COMMAND_SEPARATORS = [
  'SEMICOLON',
  'SEPARATOR_OP',
  'NEWLINE',
  'NEWLINE_LIST',
  'AND_IF',
  'OR_IF',
  'PIPE',
  'PIPE_AND',
  'AND',
  'OPEN_PAREN',
  'CLOSE_PAREN',
  'DSEMI',
  'SEMI_AND',
  'DSEMI_AND',
];

/** Reserved words (still plain words at this phase) after which a command starts. */
const COMMAND_STARTING_WORDS = new Set(['then', 'do', 'else', 'elif', 'if', 'while', 'until', '{', '!', 'time', 'coproc']);

/** Operators whose right-hand side is one word, a pattern or a regular expression. */
const PATTERN_OPERATORS = new Set(['=~', '==', '=', '!=']);

/** Operators that are words of the expression inside `[[ ]]`, not the shell's. */
const CONDITIONAL_WORDS = ['AND_IF', 'OR_IF', 'LESS', 'GREAT', 'OPEN_PAREN', 'CLOSE_PAREN'];

const startsCommand = (previous: TokenIf | undefined) =>
  !previous || COMMAND_SEPARATORS.some((type) => previous.is(type)) || (previous.is('TOKEN') && COMMAND_STARTING_WORDS.has(previous.value));

/** How many of a text's parentheses are open at its end, quoted and escaped ones left out. */
const parenDepth = (text: string): number => {
  let depth = 0;
  let quote: string | undefined;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quote) {
      if (c === quote) quote = undefined;
      else if (c === '\\' && quote === '"') i++;
    } else if (c === '\\') {
      i++;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '(') {
      depth++;
    } else if (c === ')') {
      depth = Math.max(0, depth - 1);
    }
  }

  return depth;
};

/** `b` begins where `a` ends: nothing, not even a blank, between them. */
const touching = (a: TokenIf, b: TokenIf) => a.loc?.end?.char !== undefined && b.loc?.start?.char === a.loc.end.char + 1;

/**
 * One word from two, the second's expansions moved to where it now starts.
 * Blanks between them — inside a regular expression's parentheses, `(one
 * two)` — are part of it.
 */
const join = (a: TokenIf, b: TokenIf): TokenIf => {
  const offset = b.loc!.start!.char! - a.loc!.start!.char!;
  const moved = (b.expansion ?? []).map((xp) => ({ ...xp, loc: xp.loc && { start: xp.loc.start! + offset, end: xp.loc.end! + offset } }));
  const gap = Math.max(0, b.loc!.start!.char! - a.loc!.end!.char! - 1);

  return mkToken('WORD', a.value + ' '.repeat(gap) + b.value, {
    loc: { start: a.loc!.start, end: b.loc!.end },
    expansion: [...(a.expansion ?? []), ...moved],
    ctx: { ...a.ctx, pattern: true },
  });
};

/**
 * `[[ … ]]`, the conditional command. `[[` opens one only where a command
 * starts and `]]` closes it — elsewhere both are ordinary text, as in a
 * character class, `[[:alpha:]]`. Inside, `&&`, `||`, `<`, `>`, `(` and `)`
 * belong to the expression, and the right-hand side of `=~`, `==`, `=` and
 * `!=` is one word even where the tokenizer split it at a parenthesis or a
 * `|`: `=~ ^(a|b)?c$`, `== @(x|+([^/]))`.
 */
const bracketContext: LexerPhase = () =>
  async function* (tokens: AsyncIterable<TokenIf>) {
    let inConditional = false;
    let previous: TokenIf | undefined;
    // The pattern word being put together, how deep in its own parentheses it
    // is, and whether the next token may start one
    let pattern: TokenIf | undefined;
    let depth = 0;
    let patternNext = false;

    for await (const raw of tokens) {
      let token = raw;

      if (!inConditional && token.is('TOKEN') && token.value === '[[' && startsCommand(previous)) {
        token = token.setType('DOUBLE_OPEN_BRACKET');
        inConditional = true;
      } else if (inConditional) {
        const closes = token.is('TOKEN') && token.value === ']]';

        // A piece that touches the pattern so far is more of it — but a `)` only
        // when it closes a `(` of the pattern's own: `[[ ( $a = t) ]]`
        if (pattern && !closes && (touching(pattern, token) || depth > 0) && (depth > 0 || !token.is('CLOSE_PAREN'))) {
          pattern = join(pattern, token);
          depth = parenDepth(pattern.value);
          continue;
        }

        if (pattern) {
          yield pattern;
          pattern = undefined;
          depth = 0;
        }

        if (closes) {
          token = token.setType('DOUBLE_CLOSE_BRACKET');
          inConditional = false;
        } else if (patternNext && !token.is('NEWLINE') && !token.is('NEWLINE_LIST')) {
          pattern = mkToken('WORD', token.value, { loc: token.loc, expansion: token.expansion, ctx: { ...token.ctx, pattern: true } });
          depth = parenDepth(pattern.value);
          patternNext = false;
          previous = pattern;
          continue;
        } else if (CONDITIONAL_WORDS.some((type) => token.is(type))) {
          token = mkToken('WORD', token.value, { loc: token.loc });
        } else if (token.is('TOKEN')) {
          // No reserved words in here: `[[ ! ! x ]]` negates twice
          token = token.setType('WORD');
        }

        patternNext = (token.is('TOKEN') || token.is('WORD')) && PATTERN_OPERATORS.has(token.value);
      }

      previous = token;
      yield token;
    }

    if (pattern) {
      yield pattern;
    }
  };

export default bracketContext;
