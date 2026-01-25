import { mkToken, type Reducer } from '~/tokenizer/mod.ts';
import last from '~/utils/last.ts';

// Track nesting depth for proper handling of nested command substitutions like $(echo $(echo deep))
// We use a WeakMap keyed on expansion objects to track depth without modifying the Expansion type
const nestingDepthMap = new WeakMap<object, number>();

function getNestingDepth(xp: object): number {
  return nestingDepthMap.get(xp) ?? 0;
}

function setNestingDepth(xp: object, depth: number): void {
  nestingDepthMap.set(xp, depth);
}

const expansionCommandOrArithmetic: Reducer = (state, source, reducers) => {
  const char = source && source.shift();
  const xp = last(state.expansion);

  if (char === '(' && state.current.slice(-2) === '$(') {
    return {
      nextReduction: reducers.expansionArithmetic,
      nextState: state.appendChar(char),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken('CONTINUE', '$(')],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  // Track nested parentheses to handle $(echo $(inner)) correctly
  if (char === '(') {
    const currentDepth = getNestingDepth(xp!);
    setNestingDepth(xp!, currentDepth + 1);
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
    };
  }

  if (char === ')') {
    const currentDepth = getNestingDepth(xp!);
    if (currentDepth > 0) {
      // This closes a nested parenthesis, not the outer command substitution
      setNestingDepth(xp!, currentDepth - 1);
      return {
        nextReduction: reducers.expansionCommandOrArithmetic,
        nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
      };
    }
    // Depth is 0, this closes the command substitution
    return {
      nextReduction: state.previousReducer,
      nextState: state.appendChar(char).replaceLastExpansion({
        type: 'CommandExpansion',
        loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
      }),
    };
  }

  return {
    nextReduction: reducers.expansionCommandOrArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
  };
};

export default expansionCommandOrArithmetic;
