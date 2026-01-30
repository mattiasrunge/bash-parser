import type {
  AstIoNumber,
  AstNode,
  AstNodeArithmeticCommand,
  AstNodeAssignmentWord,
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
} from '~/ast/types.ts';

export type ElseClaus = AstNode & {
  type: 'else';
  text: 'else';
};
export type Separator = {
  type: 'separator_op' | 'newline_list';
  text: string;
};

/**
 * An object containing methods to build the final AST. This object is mixed into the Jison grammar, and any of its methods can be called directly from the grammar EBNF source.
 */

export type AstBuilder = {
  caseItem: (
    pattern: AstNodeWord[],
    body: AstNodeCompoundList,
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeCaseItem;

  caseClause: (
    clause: AstNodeWord,
    cases: AstNodeCaseItem[],
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeCase;

  doGroup: (
    group: AstNodeCompoundList,
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeCompoundList;

  braceGroup: (
    group: AstNodeCompoundList,
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeCompoundList;

  list: (
    logicalExpression: AstNodeLogicalExpression,
  ) => AstNodeScript;

  emptyScript: () => AstNodeScript;

  checkAsync: (
    list: AstNodeScript,
    separator: Separator,
  ) => AstNodeScript;

  listAppend: (
    list: AstNodeScript,
    logicalExpression: AstNodeLogicalExpression,
    separator: Separator,
  ) => AstNodeScript;

  addRedirections: (
    compoundCommand: AstNodeCompoundList,
    redirectList: AstNodeRedirect[],
  ) => AstNodeCompoundList;

  term: (
    logicalExpression: AstNodeLogicalExpression,
  ) => AstNodeCompoundList;

  termAppend: (
    term: AstNodeCompoundList,
    logicalExpression: AstNodeLogicalExpression,
    separator: Separator,
  ) => AstNodeCompoundList;

  subshell: (
    list: AstNodeCompoundList,
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeSubshell;

  arithmeticCommand: (
    words: AstNodeWord[],
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeArithmeticCommand;

  conditionalCommand: (
    words: AstNodeWord[],
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeConditionalCommand;

  pipeSequence: (
    command: AstNodeCommand,
  ) => AstNodePipeline;

  pipeSequenceAppend: (
    pipe: AstNodePipeline,
    command: AstNodeCommand,
  ) => AstNodePipeline;

  bangPipeLine: (
    pipe: AstNodePipeline,
  ) => AstNode & { bang: boolean };

  pipeLine: (
    pipe: AstNodePipeline,
  ) => AstNodePipeline['commands'][0] | AstNodePipeline;

  andAndOr: (
    left: AstNodeLogicalExpression['left'],
    right: AstNodeLogicalExpression['right'],
  ) => AstNodeLogicalExpression;

  orAndOr: (
    left: AstNodeLogicalExpression['left'],
    right: AstNodeLogicalExpression['right'],
  ) => AstNodeLogicalExpression;

  forClause: (
    name: AstNodeWord,
    wordlist: AstNodeWord[],
    doGroup: AstNodeCompoundList,
    locStart: AstSourceLocation,
  ) => AstNodeFor;

  forClauseDefault: (
    name: AstNodeWord,
    doGroup: AstNodeCompoundList,
    locStart: AstSourceLocation,
  ) => AstNodeFor;

  functionDefinition: (
    name: AstNodeWord,
    body: [AstNodeCompoundList, AstNodeRedirect[] | undefined],
  ) => AstNodeFunction;

  elseClause: (
    compoundList: AstNodeCompoundList,
    elseClaus: ElseClaus,
  ) => AstNodeCompoundList;

  ifClause: (
    clause: AstNodeCompoundList,
    then: AstNodeCompoundList,
    elseBranch: AstNodeCompoundList,
    locStart: AstSourceLocation,
    locEnd: AstSourceLocation,
  ) => AstNodeIf;

  while: (
    clause: AstNodeCompoundList,
    body: AstNodeCompoundList,
    whileWord: AstNodeWord,
  ) => AstNodeWhile;

  until: (
    clause: AstNodeCompoundList,
    body: AstNodeCompoundList,
    whileWord: AstNodeWord,
  ) => AstNodeUntil;

  commandName: (
    name: AstNodeWord,
  ) => AstNodeWord;

  commandAssignment: (
    prefix: NonNullable<AstNodeCommand['prefix']>,
  ) => AstNodeCommand;

  command: (
    prefix: NonNullable<AstNodeCommand['prefix']>,
    command?: AstNodeWord,
    suffix?: NonNullable<AstNodeCommand['suffix']>,
  ) => AstNodeCommand;

  ioRedirect: (
    op: AstNodeWord,
    file: AstNodeWord,
  ) => AstNodeRedirect;

  numberIoRedirect: (
    ioRedirect: AstNodeRedirect,
    numberIo: AstIoNumber,
  ) => AstNodeRedirect;

  suffix: (
    item: AstNodeWord,
  ) => AstNodeWord[];

  suffixAppend: (
    list: AstNodeWord[],
    item: AstNodeWord,
  ) => AstNodeWord[];

  prefix: (
    item: AstNodeAssignmentWord | AstNodeRedirect,
  ) => Array<AstNodeAssignmentWord | AstNodeRedirect>;

  prefixAppend: (
    list: AstNode[],
    item: AstNodeAssignmentWord | AstNodeRedirect,
  ) => AstNode[];

  caseList: (
    item: AstNodeCaseItem,
  ) => AstNodeCaseItem[];

  caseListAppend: (
    list: AstNodeCaseItem[],
    item: AstNodeCaseItem,
  ) => AstNodeCaseItem[];

  pattern: (
    item: AstNodeWord,
  ) => AstNodeWord[];

  patternAppend: (
    list: AstNodeWord[],
    item: AstNodeWord,
  ) => AstNodeWord[];
};
