import last from '../utils/last.ts';
import { mkToken } from './token.ts';
import type { Expansion, Reducer, ReducerLocation, ReducerNextState, Reducers, ReducerStateIf, TokenIf } from './types.ts';

class State implements ReducerStateIf {
  operators: Record<string, string>;
  current = '';
  escaping = false;
  arrayAssignment = false;
  expansion: Expansion[] = [];
  previousReducer: Reducer;
  loc: ReducerLocation;
  delimiterStartLoc?: { row?: number; col?: number; char?: number };

  constructor(reducers: Reducers, operators: Record<string, string>) {
    this.operators = operators;
    this.previousReducer = reducers.start;
    this.loc = {
      start: { col: 1, row: 1, char: 0 },
      previous: null,
      current: { col: 1, row: 1, char: 0 },
    };
  }

  setLoc(loc: ReducerLocation) {
    this.loc = loc;
    return this;
  }

  setEscaping(escaping: boolean) {
    this.escaping = escaping;
    return this;
  }

  setArrayAssignment(arrayAssignment: boolean) {
    this.arrayAssignment = arrayAssignment;
    return this;
  }

  setExpansion(expansion: Expansion[]) {
    this.expansion = expansion;
    return this;
  }

  setPreviousReducer(previousReducer: Reducer) {
    this.previousReducer = previousReducer;
    return this;
  }

  setCurrent(current: string) {
    this.current = current;
    return this;
  }

  appendEmptyExpansion() {
    this.expansion = this.expansion || [];
    this.expansion.push({
      loc: {
        start: this.loc.current?.char!,
        end: this.loc.current?.char! + 1,
      },
    });
    return this;
  }

  appendChar(char: string) {
    this.current = this.current + char;
    return this;
  }

  removeLastChar() {
    this.current = this.current.slice(0, -1);
    return this;
  }

  saveCurrentLocAsStart() {
    this.loc.start = { ...this.loc.current };
    return this;
  }

  saveDelimiterStart() {
    this.delimiterStartLoc = { ...this.loc.current };
    return this;
  }

  resetCurrent() {
    this.current = '';
    return this;
  }

  replaceLastExpansion(fields: Partial<Expansion>) {
    const xp = last(this.expansion);
    Object.assign(xp!, fields);
    return this;
  }

  deleteLastExpansionValue() {
    const xp = last(this.expansion);
    delete xp?.value;
    return this;
  }

  advanceLoc(char: string) {
    // Runs once per character of input, so this is the parser's hot loop. The
    // location is three flat position records; copying them by hand is ~20x
    // cheaper than structuredClone, which was most of the cost of parsing.
    const loc: ReducerLocation = {
      start: { ...this.loc.start },
      previous: { ...this.loc.current },
      current: { ...this.loc.current },
    };
    if (this.loc.end) {
      loc.end = { ...this.loc.end };
    }

    if (char === '\n') {
      loc.current!.row!++;
      loc.current!.col = 1;
    } else {
      loc.current!.col!++;
    }

    loc.current!.char!++;

    if (char && char.match(/\s/) && this.current === '') {
      loc.start = { ...loc.current };
    }

    return this.setLoc(loc);
  }

  tokenOrEmpty() {
    if (this.current !== '' && this.current !== '\n') {
      const expansion = (this.expansion || []).map((xp) => {
        // console.log('aaa', {token: state.loc, xp: xp.loc});
        return Object.assign({}, xp, {
          loc: {
            start: xp.loc!.start! - this.loc.start!.char!,
            end: xp.loc!.end! - this.loc.start!.char!,
          },
        });
      });

      const token = mkToken('TOKEN', this.current, {
        loc: {
          start: Object.assign({}, this.loc.start),
          end: Object.assign({}, this.loc.previous),
        },
        expansion,
      });

      /* if (state.expansion && state.expansion.length) {
        token.expansion = state.expansion;
      }*/

      return [token];
    }

    return [];
  }

  operatorTokens() {
    const type = this.operators[this.current as keyof typeof this.operators];
    const token = mkToken(type, this.current, {
      loc: {
        start: Object.assign({}, this.loc.start),
        end: Object.assign({}, this.loc.previous),
      },
    });

    return [token];
  }

  isPartOfOperator(text: string) {
    return Object.keys(this.operators).some((op) => op.slice(0, text.length) === text);
  }

  isOperator() {
    return this.current in this.operators;
  }
}

/** A here-document's text, read by the tokenizer: the lines between `<<WORD` and `WORD`. */
export type HereDocument = {
  body: string;
  /** Any part of the delimiter was quoted: the body is taken literally, with no expansion. */
  quoted: boolean;
};

/** `'EOF'`, `"EOF"`, `\EOF` and `E"O"F` all end at a line reading `EOF`; quoting any of it makes the body literal. */
const hereDocumentDelimiter = (raw: string): { delimiter: string; quoted: boolean } => ({
  delimiter: raw.replace(/\\(.)/g, '$1').replace(/['"]/g, ''),
  quoted: /['"\\]/.test(raw),
});

/**
 * A function that receives reducers and returns another function that, given shell source code, returns an iterable of parsed tokens.
 *
 * Here-documents are read here rather than by a reducer, because their body is not shell code at
 * all: after `<<` the next word is the delimiter, and when the line that holds it ends, the lines
 * that follow — up to one that is the delimiter alone — are taken out of the source as they are.
 * The delimiter's token carries `ctx.heredoc`, an index into `hereDocuments`, which is how the
 * parser attaches the body to its redirect; the body may only be read after the redirect is
 * reduced (`cat <<EOF | grep x`), so it cannot travel on the token itself.
 *
 * @param hereDocuments Filled with each here-document's text, in the order they appear.
 * @returns A function that takes shell source code and returns an iterable of parsed tokens.
 */
export const tokenize = (r: Reducers, operators: Record<string, string>, hereDocuments: HereDocument[] = []) => (async function* (src: string): AsyncIterable<TokenIf> {
  let state = new State(r, operators);

  let reduction: Reducer | null = r.start;

  const source = Array.from(src);

  // After `<<` or `<<-`: the next word is a delimiter. Then its body waits for the end of the line.
  let delimiterNext: { strip: boolean } | null = null;
  const pending: { index: number; delimiter: string; strip: boolean }[] = [];

  /** One line of the source, taken out of it, without its newline; undefined at the end. */
  const takeLine = (): string | undefined => {
    if (source.length === 0) return undefined;
    let line = '';
    while (source.length > 0) {
      const c = source.shift()!;
      state = state.advanceLoc(c) as State;
      if (c === '\n') return line;
      line += c;
    }
    return line;
  };

  while (reduction !== null) {
    const char = source[0];
    const reducerdState: ReducerNextState = reduction!(state, source, r);
    reduction = reducerdState.nextReduction;

    const tokensToEmit = reducerdState.tokensToEmit;
    const nextState = reducerdState.nextState;
    let lineEnded = false;

    if (tokensToEmit) {
      for (const token of tokensToEmit) {
        if (token.type !== 'TOKEN' && (token.value === '<<' || token.value === '<<-')) {
          delimiterNext = { strip: token.value === '<<-' };
        } else if (delimiterNext && token.type === 'TOKEN') {
          const { delimiter, quoted } = hereDocumentDelimiter(token.value);
          token.ctx.heredoc = hereDocuments.length;
          pending.push({ index: hereDocuments.length, delimiter, strip: delimiterNext.strip });
          hereDocuments.push({ body: '', quoted });
          delimiterNext = null;
        } else if (token.type === 'NEWLINE') {
          lineEnded = true;
        } else if (token.type === 'EOF' && pending.length > 0) {
          // Input ended on the `<<` line itself: the body has not come yet.
          yield mkToken('CONTINUE', 'here-document');
          return;
        }
      }
      yield* tokensToEmit;
    }

    if (nextState) {
      state = nextState.advanceLoc(char) as State;
    } else {
      state = state.advanceLoc(char);
    }

    // The line with the `<<` ended: its here-documents follow, one after the other.
    if (lineEnded && pending.length > 0) {
      for (const doc of pending.splice(0)) {
        let body = '';
        let closed = false;
        for (let line = takeLine(); line !== undefined; line = takeLine()) {
          // `<<-` drops leading tabs, from the body and from the closing line alike.
          const text = doc.strip ? line.replace(/^\t+/, '') : line;
          if (text === doc.delimiter) {
            closed = true;
            break;
          }
          body += text + '\n';
        }
        hereDocuments[doc.index].body = body;
        if (!closed) {
          // Like an unclosed quote: an interactive shell asks for the rest, a script fails.
          yield mkToken('CONTINUE', 'here-document');
          return;
        }
      }
      state = state.saveCurrentLocAsStart();
    }
  }
});
