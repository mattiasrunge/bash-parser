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
