import { tryParseArithmetic } from '../arithmetic/mod.ts';
import type { AstBuilder, Separator } from '../ast/builder-if.ts';
import type {
  AstArithmeticForPart,
  AstConditionalBinaryExpression,
  AstConditionalExpression,
  AstConditionalLogicalExpression,
  AstConditionalNegation,
  AstConditionalUnaryExpression,
  AstConditionalWord,
  AstIoNumber,
  AstNode,
  AstNodeArithmeticCommand,
  AstNodeArithmeticFor,
  AstNodeCase,
  AstNodeCaseItem,
  AstNodeCommand,
  AstNodeCompoundList,
  AstNodeConditionalCommand,
  AstNodeCoproc,
  AstNodeFor,
  AstNodeFunction,
  AstNodeIf,
  AstNodeLogicalExpression,
  AstNodePipeline,
  AstNodeRedirect,
  AstNodeScript,
  AstNodeSelect,
  AstNodeSubshell,
  AstNodeUntil,
  AstNodeWhile,
  AstNodeWord,
  AstSourceLocation,
} from '../ast/types.ts';
import { BashSyntaxError } from '../errors.ts';
import last from '../utils/last.ts';
import { writtenText } from '../utils/written.ts';

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
      let right: AstConditionalWord;
      if (op === '=~') {
        // For =~, collect all remaining words as regex pattern
        // (parentheses are regex groups, not conditional grouping)
        right = parseRegexPattern();
      } else {
        right = parseWord();
      }
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

  function parseRegexPattern(): AstConditionalWord {
    const parts: string[] = [];
    while (hasMore() && current()!.text !== '&&' && current()!.text !== '||') {
      parts.push(advance().text);
    }
    if (parts.length === 0) {
      throw new SyntaxError('Expected regex pattern after =~');
    }
    const node: AstConditionalWord = {
      type: 'ConditionalWord',
      text: parts.join(''),
    };
    return node;
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
    // Quotes and all, when quote removal changed it: an arithmetic operand is
    // expanded from this, `m['$(cmd)']` being the key `$(cmd)`
    const written = writtenText.get(word);
    if (written !== undefined && written !== word.text) {
      node.written = written;
    }
    return node;
  }

  return parseOr();
}

export const astBuilder = (insertLOC?: boolean, source?: string) => {
  const builder: AstBuilder = {
    caseItem: (pattern, body, locStart, locEnd, terminator) => {
      const node: AstNodeCaseItem = { type: 'CaseItem', pattern, body };

      // `;;` is what an item without one means; only the other two are kept
      if (terminator === ';&' || terminator === ';;&') {
        node.terminator = terminator;
      }

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
        last(list.commands)!.async = true;
      }

      return list;
    },

    listAppend: (list, logicalExpression, separator) => {
      if (isAsyncSeparator(separator)) {
        last(list.commands)!.async = true;
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
        last(term.commands)!.async = true;
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

    arithmeticCommand: (words, open, close) => {
      const locStart = open.loc!;
      const locEnd = close.loc!;
      // The text between the parentheses as written, quotes, blanks and all, which is what bash
      // expands and evaluates; the words, quotes removed, where there is no source to take it from
      const body = source !== undefined && open.span && close.span ? source.slice(open.span[1] + 1, close.span[0]) : undefined;
      const expression = body ?? words.map((w) => w.text).join(' ');

      // Absolute positions in the arithmetic AST start where the body does: its word's own location,
      // or — without locations — after "(( ", the usual spacing.
      const sourceOffset = body !== undefined ? open.span![1] + 1 : words[0]?.loc?.start?.char ?? (locStart?.start?.char !== undefined ? locStart.start.char + 3 : undefined);

      // Absent when the text is not arithmetic as written; the executor parses it after expansion
      const arithmeticAST = tryParseArithmetic(expression, { sourceOffset });

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

    pipeSequenceAppend: (pipe, command, stderrToo = false) => {
      if (stderrToo) {
        // `|&`: the command before it sends its stderr down the pipe as well, `2>&1`
        const left = pipe.commands[pipe.commands.length - 1] as AstNodeCommand & { redirections?: AstNodeRedirect[] };
        const redirect: AstNodeRedirect = {
          type: 'Redirect',
          op: { type: 'Greatand', text: '>&' } as unknown as AstNodeWord,
          file: { type: 'Word', text: '1' } as AstNodeWord,
          numberIo: { type: 'IoNumber', text: '2' } as unknown as AstIoNumber,
        };

        if (left.type === 'Command') {
          left.suffix = [...(left.suffix ?? []), redirect];
        } else {
          left.redirections = [...(left.redirections ?? []), redirect];
        }
      }

      pipe.commands.push(command);

      if (insertLOC) {
        setLocEnd(pipe.loc!, command.loc);
      }

      return pipe;
    },

    // A pipeline of one command is unwrapped by now, so what is negated may be any command
    bangPipeLine: (pipeline) => {
      // Two negations cancel out
      if (pipeline.bang) {
        delete pipeline.bang;
      } else {
        pipeline.bang = true;
      }

      return pipeline;
    },

    // `time time -p cmd` reports once, in POSIX's format if either asked for it
    timedPipeLine: (pipeline, posix) => {
      pipeline.time = { posix: posix || Boolean(pipeline.time?.posix) };

      return pipeline;
    },

    coproc: (name, body, locStart) => {
      const node: AstNodeCoproc = { type: 'Coproc', name: typeof name === 'string' ? name : name.text, body };

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), body.loc);
      }

      return node;
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

    arithmeticForClause: (words, doGroup, locStart, open, close) => {
      // The body as written, as for `((`; its three parts are split at the `;` outside any
      // parentheses, and an empty part is left out.
      const raw = source !== undefined && open?.span && close?.span ? source.slice(open.span[1] + 1, close.span[0]) : undefined;
      const body = raw ?? words.map((w) => w.text).join(' ');
      const bodyStart = raw !== undefined ? open!.span![1] + 1 : words[0]?.loc?.start?.char;
      const parts: { text: string; offset: number }[] = [];
      let depth = 0;
      let from = 0;
      for (let i = 0; i <= body.length; i++) {
        const char = body[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if ((char === ';' && depth === 0) || i === body.length) {
          parts.push({ text: body.slice(from, i), offset: from });
          from = i + 1;
        }
      }
      if (parts.length !== 3) {
        const location = bodyStart !== undefined ? { start: { char: bodyStart } } : undefined;
        const error = new BashSyntaxError(`for (( … )) takes three expressions separated by ';', got "${body}"`, source, location);

        // bash: `arithmetic expression required` for too few, `;' unexpected` for too many
        error.detail = { kind: 'arithmeticFor', problem: parts.length < 3 ? 'arithmetic expression required' : "`;' unexpected", text: `((${body}))` };
        throw error;
      }

      const part = ({ text, offset }: { text: string; offset: number }): AstArithmeticForPart | undefined => {
        // bash shows a part from its first non-blank on, and keeps what follows it: `-- `
        const expression = text.trimStart();
        if (expression.trim() === '') return undefined;
        const lead = text.length - expression.length;
        const sourceOffset = bodyStart !== undefined ? bodyStart + offset + lead : undefined;
        return { expression, arithmeticAST: tryParseArithmetic(expression, { sourceOffset }) };
      };

      const node: AstNodeArithmeticFor = { type: 'ArithmeticFor', do: doGroup };
      const [init, test, update] = parts.map(part);
      if (init) node.init = init;
      if (test) node.test = test;
      if (update) node.update = update;

      if (insertLOC) {
        node.loc = setLocEnd(setLocStart({ start: {}, end: {} }, locStart), doGroup.loc);
      }

      return node;
    },

    selectClause: (name, wordlist, doGroup, locStart) => {
      const node: AstNodeSelect = { type: 'Select', name, do: doGroup };

      if (wordlist) {
        node.wordlist = wordlist;
      }

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
