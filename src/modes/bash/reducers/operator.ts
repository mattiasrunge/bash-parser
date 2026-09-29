import { mkToken } from '../../../tokenizer/token.ts';
import type { Reducer, TokenIf } from '../../../tokenizer/types.ts';
import { closesArithmetic } from './arithmetic-command.ts';

const operator: Reducer = (state, source, reducers) => {
  const char = source && source.shift();

  // console.log('isOperator ', {state,char})

  if (char === undefined) {
    if (state.isOperator()) {
      return {
        nextReduction: reducers.end,
        tokensToEmit: state.operatorTokens(),
        nextState: state.resetCurrent().saveCurrentLocAsStart(),
      };
    }
    return reducers.start(state, char ? [char] : [], reducers);
  }

  if (state.isPartOfOperator(state.current + char)) {
    return {
      nextReduction: reducers.operator,
      nextState: state.appendChar(char),
    };
  }

  let tokens: TokenIf[] = [];
  if (state.isOperator()) {
    // console.log('isOperator ', state.current)
    const arithmetic = state.current === '((' && closesArithmetic([char].concat(source));
    tokens = state.operatorTokens();

    // `((` that does not close as arithmetic opens two subshells, `((cd a); ls)`
    if (state.current === '((' && !arithmetic) {
      tokens = tokens.flatMap((token) => {
        const loc = token.loc;
        const next = loc && { ...loc.start, col: loc.start.col! + 1, char: loc.start.char! + 1 };

        return [
          mkToken('OPEN_PAREN', '(', { loc: loc && { start: loc.start, end: loc.start } }),
          mkToken('OPEN_PAREN', '(', { loc: loc && { start: next!, end: loc.end } }),
        ];
      });
    }

    state = state.resetCurrent().saveCurrentLocAsStart();
    // `((` opens an arithmetic command: what follows up to `))` is one expression, not shell.
    if (arithmetic) {
      const ret = reducers.arithmeticCommand(state, [char].concat(source), reducers);
      return { nextReduction: ret.nextReduction, tokensToEmit: tokens.concat(ret.tokensToEmit ?? []), nextState: ret.nextState };
    }
  }

  const ret = reducers.start(state, [char].concat(source), reducers);
  const nextReduction = ret.nextReduction;
  const tokensToEmit = ret.tokensToEmit;
  const nextState = ret.nextState;

  if (tokensToEmit) {
    tokens = tokens.concat(tokensToEmit);
  }
  return {
    nextReduction: nextReduction,
    tokensToEmit: tokens,
    nextState,
  };
};

export default operator;
