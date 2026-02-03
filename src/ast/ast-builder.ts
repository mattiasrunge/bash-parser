import { parseArithmetic } from '../arithmetic/mod.ts';
import type { AstBuilder, Separator } from '../ast/builder-if.ts';
import type {
  AstConditionalBinaryExpression,
  AstConditionalExpression,
  AstConditionalLogicalExpression,
  AstConditionalNegation,
  AstConditionalUnaryExpression,
  AstConditionalWord,
  AstNode,
  AstNodeArithmeticCommand,
  AstNodeCase,
  AstNodeCaseItem,
  AstNodeCommand,
  AstNodeCompoundList,
  AstNodeConditionalCommand,
  AstNodeFor,
  AstNodeFunction,
  AstNodeIf,
  AstNodeLogicalExpression,
  AstNodePipeline,
  AstNodeRedirect,
  AstNodeScript,
  AstNodeSubshell,
  AstNodeUntil,
  AstNodeWhile,
  AstNodeWord,
  AstSourceLocation,
} from '../ast/types.ts';
import { BashSyntaxError } from '../errors.ts';
import last from '../utils/last.ts';

const isAsyncSeparator = (separator: Separator) => {
  return separator.text.indexOf('&') !== -1;
};

const setLocStart = (target: AstSourceLocation, source?: AstSourceLocation) => {
  if (source) {
    target.start = source.start;
  }

  return target;
};

const setLocEnd = (target: AstSourceLocation, source?: AstSourceLocation) => {
  if (source) {
    target.end = source.end;
  }

  return target;
};

// Operators for conditional expressions
const UNARY_OPS = new Set([
  '-a',
  '-b',
  '-c',
  '-d',
  '-e',
  '-f',
  '-g',
  '-h',
  '-k',
  '-L',
  '-N',
  '-O',
  '-G',
  '-p',
  '-r',
  '-s',
  '-S',
  '-t',
  '-u',
  '-w',
  '-x',
  '-z',
  '-n',
  '-v',
  '-R',
]);
const BINARY_OPS = new Set([
  '==',
  '!=',
  '=~',
  '<',
  '>',
  '=',
  '-eq',
  '-ne',
  '-lt',
  '-le',
  '-gt',
  '-ge',
  '-nt',
  '-ot',
  '-ef',
]);

/**
 * Parse an array of Word tokens into a conditional expression AST.
 */
function parseConditionalWords(words: AstNodeWord[]): AstConditionalExpression {
  let pos = 0;

  const current = (): AstNodeWord | undefined => words[pos];
  const advance = (): AstNodeWord => words[pos++];
  const match = (text: string): boolean => {
    if (current()?.text === text) {
      advance();
      return true;
    }
    return false;
  };
  const hasMore = (): boolean => pos < words.length;

  function parseOr(): AstConditionalExpression {
    let left = parseAnd();
    while (match('||')) {
      const right = parseAnd();
      const node: AstConditionalLogicalExpression = {
        type: 'ConditionalLogicalExpression',
        operator: '||',
        left,
        right,
      };
      left = node;
    }
    return left;
  }

  function parseAnd(): AstConditionalExpression {
    let left = parseNot();
    while (match('&&')) {
      const right = parseNot();
      const node: AstConditionalLogicalExpression = {
        type: 'ConditionalLogicalExpression',
        operator: '&&',
        left,
        right,
      };
      left = node;
    }
    return left;
  }

  function parseNot(): AstConditionalExpression {
    if (match('!')) {
      const node: AstConditionalNegation = {
        type: 'ConditionalNegation',
        argument: parseNot(),
      };
      return node;
    }
    return parsePrimary();
  }

  function parsePrimary(): AstConditionalExpression {
    if (match('(')) {
      const expr = parseOr();
      if (!match(')')) {
        throw new SyntaxError('Expected ) in conditional expression');
      }
      return expr;
    }
    return parseTest();
  }

  function parseTest(): AstConditionalExpression {
    const word = current();
    if (!word) {
      throw new SyntaxError('Unexpected end of conditional expression');
    }

    // Unary operator: -f file, -z "$var"
    if (UNARY_OPS.has(word.text)) {
      advance();
      const arg = parseWord();
      const node: AstConditionalUnaryExpression = {
        type: 'ConditionalUnaryExpression',
        operator: word.text,
        argument: arg,
      };
      return node;
    }

    // Binary operator: word OP word
    const left = parseWord();
    if (hasMore() && BINARY_OPS.has(current()!.text)) {
      const op = advance().text;
      const right = parseWord();
      const node: AstConditionalBinaryExpression = {
        type: 'ConditionalBinaryExpression',
        operator: op,
        left,
        right,
      };
      return node;
    }

    // Just a word (truthy test for non-empty string)
    return left;
  }

  function parseWord(): AstConditionalWord {
    const word = current();
    if (!word) {
      throw new SyntaxError('Expected word in conditional expression');
    }
    advance();
    const node: AstConditionalWord = {
      type: 'ConditionalWord',
      text: word.text,
    };
    if (word.expansion && word.expansion.length > 0) {
      node.expansion = word.expansion;
    }
    return node;
  }

  return parseOr();
}

export const astBuilder = (insertLOC?: boolean) => {
  const builder: AstBuilder = {
    caseItem: (pattern, body, locStart, locEnd) => {
      const node: AstNodeCaseItem = { type: 'CaseItem', pattern, body };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    caseClause: (clause, cases, locStart, locEnd) => {
      const node: AstNodeCase = { type: 'Case', clause };

      if (cases) {
        Object.assign(node, { cases });
      }

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    doGroup: (group, locStart, locEnd) => {
      if (insertLOC) {
        setLocEnd(setLocStart(group.loc!, locStart), locEnd);
      }

      return group;
    },

    braceGroup: (group, locStart, locEnd) => {
      if (insertLOC) {
        setLocEnd(setLocStart(group.loc!, locStart), locEnd);
      }

      return group;
    },

    list: (logicalExpression) => {
      const node: AstNodeScript = { type: 'Script', commands: [logicalExpression] };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, logicalExpression.loc), logicalExpression.loc);
      }

      return node;
    },

    emptyScript: () => {
      const node: AstNodeScript = { type: 'Script', commands: [] };
      return node;
    },

    checkAsync: (list, separator) => {
      if (isAsyncSeparator(separator)) {
        last(list.commands as AstNodeCommand[])!.async = true;
      }

      return list;
    },

    listAppend: (list, logicalExpression, separator) => {
      if (isAsyncSeparator(separator)) {
        last(list.commands as AstNodeCommand[])!.async = true;
      }

      list.commands.push(logicalExpression);

      if (insertLOC) {
        setLocEnd(list.loc!, logicalExpression.loc);
      }

      return list;
    },

    addRedirections: (compoundCommand, redirectList) => {
      compoundCommand.redirections = redirectList;

      if (insertLOC) {
        const lastRedirect = redirectList[redirectList.length - 1];
        setLocEnd(compoundCommand.loc!, lastRedirect.loc);
      }

      return compoundCommand;
    },

    term: (logicalExpression) => {
      const node: AstNodeCompoundList = { type: 'CompoundList', commands: [logicalExpression] };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, logicalExpression.loc), logicalExpression.loc);
      }

      return node;
    },

    termAppend: (term, logicalExpression, separator) => {
      if (isAsyncSeparator(separator)) {
        last(term.commands as AstNodeCommand[])!.async = true;
      }

      term.commands.push(logicalExpression);
      setLocEnd(term.loc!, logicalExpression.loc);

      return term;
    },

    subshell: (list, locStart, locEnd) => {
      const node: AstNodeSubshell = { type: 'Subshell', list };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    arithmeticCommand: (words, locStart, locEnd) => {
      // Join word texts to form the arithmetic expression
      const expression = words.map((w) => w.text).join(' ');

      // Calculate source offset for absolute positions in arithmetic AST
      // +3 accounts for "(( " (opening parens + typical space)
      const sourceOffset = locStart?.start?.char !== undefined ? locStart.start.char + 3 : undefined;

      // Parse the arithmetic expression
      let arithmeticAST;
      try {
        arithmeticAST = parseArithmetic(expression, { sourceOffset });
      } catch (err) {
        if (err instanceof BashSyntaxError) {
          throw err;
        }
        throw new SyntaxError(`Cannot parse arithmetic expression "${expression}": ${(err as Error).message}`);
      }

      const node: AstNodeArithmeticCommand = {
        type: 'ArithmeticCommand',
        expression,
        arithmeticAST,
      };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    conditionalCommand: (words, locStart, locEnd) => {
      // Join word texts to form the expression string
      const expression = words.map((w: AstNodeWord) => w.text).join(' ');

      // Parse the conditional expression
      let conditionAST;
      try {
        conditionAST = parseConditionalWords(words);
      } catch (err) {
        if (err instanceof BashSyntaxError) {
          throw err;
        }
        throw new SyntaxError(`Cannot parse conditional expression "${expression}": ${(err as Error).message}`);
      }

      const node: AstNodeConditionalCommand = {
        type: 'ConditionalCommand',
        expression,
        conditionAST,
      };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    pipeSequence: (command) => {
      const node: AstNodePipeline = { type: 'Pipeline', commands: [command] };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, command.loc), command.loc);
      }

      return node;
    },

    pipeSequenceAppend: (pipe, command) => {
      pipe.commands.push(command);

      if (insertLOC) {
        setLocEnd(pipe.loc!, command.loc);
      }

      return pipe;
    },

    bangPipeLine: (pipe) => {
      const bang = true;

      if (pipe.commands.length === 1) {
        return Object.assign(pipe.commands[0], { bang });
      }

      return Object.assign(pipe, { bang });
    },

    pipeLine: (pipe) => {
      if (pipe.commands.length === 1) {
        return pipe.commands[0];
      }

      return pipe;
    },

    andAndOr: (left, right) => {
      const node: AstNodeLogicalExpression = { type: 'LogicalExpression', op: 'and', left, right };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, left.loc), right.loc);
      }

      return node;
    },

    orAndOr: (left, right) => {
      const node: AstNodeLogicalExpression = { type: 'LogicalExpression', op: 'or', left, right };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, left.loc), right.loc);
      }

      return node;
    },

    forClause: (name, wordlist, doGroup, locStart) => {
      const node: AstNodeFor = { type: 'For', name, wordlist, do: doGroup };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), doGroup.loc);
      }

      return node;
    },

    forClauseDefault: (name, doGroup, locStart) => {
      const node: AstNodeFor = { type: 'For', name, do: doGroup };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), doGroup.loc);
      }

      return node;
    },

    functionDefinition: (name, body) => {
      const node: AstNodeFunction = { type: 'Function', name, body: body[0] };

      let endLoc: AstNode = body[0];

      if (body[1]) {
        node.redirections = body[1];
        endLoc = last(body[1])!;
      }

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, name.loc), endLoc.loc);
      }

      return node;
    },

    elseClause: (compoundList, elseClaus) => {
      if (insertLOC) {
        setLocStart(compoundList.loc!, elseClaus.loc);
      }

      return compoundList;
    },

    ifClause: (clause, then, elseBranch, locStart, locEnd) => {
      const node: AstNodeIf = { type: 'If', clause, then };

      if (elseBranch) {
        node.else = elseBranch;
      }

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), locEnd);
      }

      return node;
    },

    while: (clause, body, whileWord) => {
      const node: AstNodeWhile = { type: 'While', clause, do: body };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, whileWord.loc), body.loc);
      }

      return node;
    },

    until: (clause, body, whileWord) => {
      const node: AstNodeUntil = { type: 'Until', clause, do: body };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, whileWord.loc), body.loc);
      }

      return node;
    },

    commandName: (name) => name,

    commandAssignment: (prefix) => {
      return builder.command(prefix);
    },

    command: (prefix, command, suffix) => {
      const node: AstNodeCommand = { type: 'Command' };

      if (command) {
        node.name = command;
      }

      if (insertLOC) {
        node.loc = { start: {}, end: {} };
        if (prefix) {
          const firstPrefix = prefix[0];
          node.loc.start = firstPrefix.loc!.start;
        } else if (command) {
          node.loc.start = command.loc!.start;
        }

        if (suffix) {
          const lastSuffix = suffix[suffix.length - 1];
          node.loc.end = lastSuffix.loc!.end;
        } else if (command) {
          node.loc.end = command.loc!.end;
        } else if (prefix) {
          const lastPrefix = prefix[prefix.length - 1];
          node.loc.end = lastPrefix.loc!.end;
        }
      }

      if (prefix) {
        node.prefix = prefix;
      }

      if (suffix) {
        node.suffix = suffix;
      }

      return node;
    },

    ioRedirect: (op, file) => {
      const node: AstNodeRedirect = { type: 'Redirect', op: op, file: file };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, op.loc), file.loc);
      }

      return node;
    },

    numberIoRedirect: (ioRedirect, numberIo) => {
      const node: AstNodeRedirect = Object.assign({}, ioRedirect, { numberIo });

      if (insertLOC) {
        setLocStart(node.loc!, numberIo.loc);
      }

      return node;
    },

    caseList: (item) => {
      return [item];
    },

    caseListAppend: (list, item) => {
      list.push(item);
      return list;
    },

    pattern: (item) => {
      return [item];
    },

    patternAppend: (list, item) => {
      list.push(item);
      return list;
    },

    prefix: (item) => {
      return [item];
    },

    prefixAppend: (list, item) => {
      list.push(item);
      return list;
    },

    suffix: (item) => {
      return [item];
    },

    suffixAppend: (list, item) => {
      list.push(item);
      return list;
    },
  };

  return builder;
};
