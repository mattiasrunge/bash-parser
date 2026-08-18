import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';
import last from '../../../utils/last.ts';

// Track nesting depth for proper handling of nested command substitutions like $(echo $(echo deep))
// We use a WeakMap keyed on expansion objects to track depth without modifying the Expansion type
const nestingDepthMap = new WeakMap<object, number>();

// Track quote state inside command substitutions
// undefined = not in quotes, 'single' = in single quotes, 'double' = in double quotes
type QuoteState = { type: 'single' | 'double'; startChar: number } | undefined;
const quoteStateMap = new WeakMap<object, QuoteState>();
// Track escaping state
const escapingMap = new WeakMap<object, boolean>();

function getNestingDepth(xp: object): number {
  return nestingDepthMap.get(xp) ?? 0;
}

function setNestingDepth(xp: object, depth: number): void {
  nestingDepthMap.set(xp, depth);
}

function getQuoteState(xp: object): QuoteState {
  return quoteStateMap.get(xp);
}

function setQuoteState(xp: object, state: QuoteState): void {
  quoteStateMap.set(xp, state);
}

function isEscaping(xp: object): boolean {
  return escapingMap.get(xp) ?? false;
}

function setEscaping(xp: object, value: boolean): void {
  escapingMap.set(xp, value);
}

const expansionCommandOrArithmetic: Reducer = (state, source, reducers) => {
  const char = source && source.shift();
  const xp = last(state.expansion);
  const quoteState = getQuoteState(xp!);
  const escaping = isEscaping(xp!);

  if (char === '(' && state.current.slice(-2) === '$(' && !xp!.command) {
    return {
      nextReduction: reducers.expansionArithmetic,
      nextState: state.appendChar(char),
    };
  }

  if (char === undefined) {
    // EOF reached - check if we're inside a quote
    if (quoteState) {
      // Emit CONTINUE for unclosed quote with its location
      const quoteChar = quoteState.type === 'single' ? "'" : '"';
      return {
        nextReduction: state.previousReducer,
        tokensToEmit: [mkToken('CONTINUE', quoteChar, {
          loc: {
            start: { char: quoteState.startChar },
            end: { char: quoteState.startChar },
          },
        })],
        nextState: state.replaceLastExpansion({
          loc: Object.assign({}, xp!.loc, { end: state.loc.previous?.char }),
        }),
      };
    }
    // Not in quote - emit CONTINUE for unclosed $(
    return {
      nextReduction: state.previousReducer,
      tokensToEmit: [mkToken(
        'CONTINUE',
        '$(',
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

  // Handle escaping (only matters in double quotes)
  if (!escaping && char === '\\' && quoteState?.type === 'double') {
    setEscaping(xp!, true);
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
    };
  }

  // Handle entering/exiting single quotes (not affected by escaping)
  if (char === "'" && !escaping) {
    if (!quoteState) {
      // Enter single quotes
      setQuoteState(xp!, { type: 'single', startChar: state.loc.current?.char ?? 0 });
    } else if (quoteState.type === 'single') {
      // Exit single quotes
      setQuoteState(xp!, undefined);
    }
    // If in double quotes, single quote is literal
    setEscaping(xp!, false);
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
    };
  }

  // Handle entering/exiting double quotes
  if (char === '"' && !escaping) {
    if (!quoteState) {
      // Enter double quotes
      setQuoteState(xp!, { type: 'double', startChar: state.loc.current?.char ?? 0 });
    } else if (quoteState.type === 'double') {
      // Exit double quotes
      setQuoteState(xp!, undefined);
    }
    // If in single quotes, double quote is literal
    setEscaping(xp!, false);
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
    };
  }

  // Reset escaping for any other character
  setEscaping(xp!, false);

  // Track nested parentheses to handle $(echo $(inner)) correctly
  // Only count parentheses when not inside quotes
  if (char === '(' && !quoteState) {
    const currentDepth = getNestingDepth(xp!);
    setNestingDepth(xp!, currentDepth + 1);
    return {
      nextReduction: reducers.expansionCommandOrArithmetic,
      nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
    };
  }

  if (char === ')') {
    // Only process closing paren if not in quotes
    if (!quoteState) {
      const currentDepth = getNestingDepth(xp!);
      if (currentDepth > 0) {
        // This closes a nested parenthesis, not the outer command substitution
        setNestingDepth(xp!, currentDepth - 1);
        return {
          nextReduction: reducers.expansionCommandOrArithmetic,
          nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
        };
      }
      // Depth is 0 and not in quotes, this closes the command substitution
      return {
        nextReduction: state.previousReducer,
        nextState: state.appendChar(char).replaceLastExpansion({
          type: xp!.direction ? 'ProcessSubstitution' : 'CommandExpansion',
          loc: Object.assign({}, xp!.loc, { end: state.loc.current?.char }),
        }),
      };
    }
    // Inside quotes, ) is just a literal character
  }

  return {
    nextReduction: reducers.expansionCommandOrArithmetic,
    nextState: state.appendChar(char).replaceLastExpansion({ command: (xp!.command || '') + char }),
  };
};

export default expansionCommandOrArithmetic;
