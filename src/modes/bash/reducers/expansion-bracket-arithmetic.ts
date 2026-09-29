import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';

// How many `[` are open inside the expression, `$[a[1]+2]`
const depthMap = new WeakMap<object, number>();

/**
 * `$[expr]`, bash's old spelling of `$((expr))`: the expression runs to the
 * `]` that closes the one after the `$`, and is an arithmetic expansion.
 */
const expansionBracketArithmetic: Reducer = (state, source) => {
  const char = source && source.shift();
  const xp = last(state.expansion);
  const depth = depthMap.get(xp!) ?? 0;
  const value = xp?.value || '';

  if (char === ']' && depth === 0) {
    return {
      nextReduction: state.previousReducer,
      nextState: state
        .appendChar(char)
        .replaceLastExpansion({
          type: 'ArithmeticExpansion',
          expression: value,
          loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
        })
        .deleteLastExpansionValue(),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken('CONTINUE', '$[', xp?.loc ? { loc: { start: { char: xp.loc.start }, end: { char: xp.loc.start } } } : undefined)],
      nextState: state.replaceLastExpansion({ loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }) }),
    };
  }

  if (char === '[') depthMap.set(xp!, depth + 1);
  if (char === ']') depthMap.set(xp!, depth - 1);

  return {
    nextReduction: expansionBracketArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ value: value + char }),
  };
};

export default expansionBracketArithmetic;
