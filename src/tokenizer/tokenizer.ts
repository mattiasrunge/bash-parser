import last from '../utils/last.ts';
import { mkToken } from './token.ts';
import type { Expansion, Reducer, ReducerLocation, ReducerNextState, Reducers, ReducerStateIf, TokenIf } from './types.ts';

class State implements ReducerStateIf {
  operators: Record<string, string>;
  current = '';
  escaping = false;
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
    const loc = structuredClone(this.loc);
    loc.previous = { ...this.loc.current };

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

/**
 * A function that receives reducers and returns another function that, given shell source code, returns an iterable of parsed tokens.
 *
 * @returns A function that takes shell source code and returns an iterable of parsed tokens.
 */
export const tokenize = (r: Reducers, operators: Record<string, string>) => (async function* (src: string): AsyncIterable<TokenIf> {
  let state = new State(r, operators);

  let reduction: Reducer | null = r.start;

  const source = Array.from(src);

  while (reduction !== null) {
    const char = source[0];
    const reducerdState: ReducerNextState = reduction!(state, source, r);
    reduction = reducerdState.nextReduction;

    const tokensToEmit = reducerdState.tokensToEmit;
    const nextState = reducerdState.nextState;

    if (tokensToEmit) {
      yield* tokensToEmit;
    }

    if (nextState) {
      state = nextState.advanceLoc(char);
    } else {
      state = state.advanceLoc(char);
    }
  }
});
