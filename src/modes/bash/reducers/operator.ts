import type { Reducer, TokenIf } from '../../../tokenizer/types.ts';

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
    tokens = state.operatorTokens();
    state = state.resetCurrent().saveCurrentLocAsStart();
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
