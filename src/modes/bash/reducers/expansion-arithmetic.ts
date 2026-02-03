import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';

// Track nesting depth for $(...) inside arithmetic expressions
// This is needed to correctly handle cases like $(($(echo 5) + 3))
const nestingDepthMap = new WeakMap<object, number>();
// Track consecutive closing parens at depth 0 to detect ))
const consecutiveCloseMap = new WeakMap<object, number>();

function getNestingDepth(xp: object): number {
  return nestingDepthMap.get(xp) ?? 0;
}

function setNestingDepth(xp: object, depth: number): void {
  nestingDepthMap.set(xp, depth);
}

function getConsecutiveClose(xp: object): number {
  return consecutiveCloseMap.get(xp) ?? 0;
}

function setConsecutiveClose(xp: object, count: number): void {
  consecutiveCloseMap.set(xp, count);
}

const expansionArithmetic: Reducer = (state, source) => {
  const char = source && source.shift();

  const xp = last(state.expansion);
  const currentDepth = getNestingDepth(xp!);
  const value = xp?.value || '';
  const prevChar = value.slice(-1);

  // Track $( to enter command substitution nesting
  if (char === '(' && prevChar === '$') {
    setNestingDepth(xp!, currentDepth + 1);
    setConsecutiveClose(xp!, 0); // Reset consecutive close counter
    return {
      nextReduction: expansionArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ value: value + char }),
    };
  }

  // Track ) to exit command substitution nesting
  if (char === ')' && currentDepth > 0) {
    setNestingDepth(xp!, currentDepth - 1);
    setConsecutiveClose(xp!, 0); // This ) closes a command sub, not part of ))
    return {
      nextReduction: expansionArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ value: value + char }),
    };
  }

  // Handle ) at depth 0 - could be part of arithmetic close ))
  if (char === ')' && currentDepth === 0) {
    const consecutiveClose = getConsecutiveClose(xp!) + 1;
    if (consecutiveClose >= 2) {
      // We have )) at depth 0, close the arithmetic expansion
      return {
        nextReduction: state.previousReducer,
        nextState: state
          .appendChar(char)
          .replaceLastExpansion({
            type: 'ArithmeticExpansion',
            expression: xp!.value!.slice(0, -1),
            loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
          })
          .deleteLastExpansionValue(),
      };
    }
    // First ) at depth 0, track it and continue
    setConsecutiveClose(xp!, consecutiveClose);
    return {
      nextReduction: expansionArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ value: value + char }),
    };
  }

  if (char === undefined) {
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken(
        'CONTINUE',
        '$((',
        xp?.loc
          ? {
            loc: {
              start: { char: xp.loc.start },
              end: { char: xp.loc.start },
            },
          }
          : undefined,
      )],
      nextState: state.replaceLastExpansion({
        loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
      }),
    };
  }

  // Any other character resets the consecutive close counter
  setConsecutiveClose(xp!, 0);

  return {
    nextReduction: expansionArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ value: value + char }),
  };
};

export default expansionArithmetic;
