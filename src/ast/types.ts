import type { ExpansionLocation } from '~/tokenizer/types.ts';

/**
 * If the source is parsed specifing the `insertLOC` option, each node contins a `loc` property that contains the starting and ending lines and columns of the node, and the start and end index of the character in the source string.
 */
export type AstSourceLocation = {
  start: AstSourcePosition;
  end: AstSourcePosition;
};

export type AstSourcePosition = {
  row?: number;
  col?: number;
  char?: number;
};

/**
 * `Node` is the base type of all nodes in the AST. It contains a `type` property that specifies the kind of node.
 */
export type AstNode = {
  type: string;
  loc?: AstSourceLocation;
};

/**
 * `Script` is the root node of the AST. It simply represent a list of commands that form the body of the script.
 */
export type AstNodeScript = AstNode & {
  type: 'Script';
  commands: Array<
    | AstNodeLogicalExpression
    | AstNodePipeline
    | AstNodeCommand
    | AstNodeFunction
    | AstNodeSubshell
    | AstNodeFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
  >;
};

/**
 * `Pipeline` represents a list of commands concatenated with pipes.
 *
 *  Commands are executed in parallel and the output of each one become the input of the subsequent.
 */
export type AstNodePipeline = AstNode & {
  type: 'Pipeline';
  commands: Array<
    | AstNodeCommand
    | AstNodeFunction
    | AstNodeSubshell
    | AstNodeFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
  >;
};

/**
 * `LogicalExpression` represents two commands (left and right) concateneted in a `and` (&&) or `or` (||) operation.
 *
 * In the `and` Case, the right command is executed only if the left one is executed successfully. In the `or` Case, the right command is executed only if the left one fails.
 */
export type AstNodeLogicalExpression = AstNode & {
  type: 'LogicalExpression';
  op: 'and' | 'or';
  left: AstNode;
  right: AstNode;
};

/**
 * `Command` represents a builtin or external command to execute. It could optionally have a list of arguments, stream redirection operation and environment variable assignments.
 *
 * `name` properties is a Word that represents the name of the command to execute. It is optional because Command could represents bare assignment, e.g. `VARNAME = 42;`. In this case, the command node has no name.
 */
export type AstNodeCommand = AstNode & {
  type: 'Command';
  name?: AstNodeWord;
  prefix?: Array<AstNodeAssignmentWord | AstNodeRedirect>;
  suffix?: Array<AstNodeWord | AstNodeRedirect>;
  async?: boolean;
};

/**
 * `Function` represents the definition of a Function.
 *
 * It is formed by the name of the Function itself and a list of all command that forms the body of the Function. It can also contains a list of redirection that applies to all commands of the function body.
 */
export type AstNodeFunction = AstNode & {
  type: 'Function';
  name: AstNodeWord;
  redirections?: AstNodeRedirect[];
  body: AstNodeCompoundList;
};

/**
 * `CompoundList` represent a group of commands that form the body of `for`, `until` `while`, `if`, `else`, `case` items and `function` command. It can also represent a simple group of commands, with an optional list of redirections.
 */
export type AstNodeCompoundList = AstNode & {
  type: 'CompoundList';
  commands: Array<
    | AstNodeLogicalExpression
    | AstNodePipeline
    | AstNodeCommand
    | AstNodeFunction
    | AstNodeSubshell
    | AstNodeFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
  >;
  redirections?: AstNodeRedirect[];
};

/**
 * `Subshell` node represents a Subshell command. It consist of a group of one or more commands to execute in a separated shell environment.
 */
export type AstNodeSubshell = AstNode & {
  type: 'Subshell';
  list: AstNodeCompoundList;
  async?: boolean;
};

/**
 * A `For` statement. The for loop shall execute a sequence of commands for each member in a list of items.
 */
export type AstNodeFor = AstNode & {
  type: 'For';
  name: AstNodeWord;
  wordlist?: AstNodeWord[];
  do: AstNodeCompoundList;
};

/**
 * A `Case` statement. The conditional construct Case shall execute the CompoundList corresponding to the first one of several patterns that is matched by the `clause` Word.
 */

export type AstNodeCase = AstNode & {
  type: 'Case';
  clause: AstNodeWord;
  cases?: AstNodeCaseItem[];
};

/**
 * `CaseItem` represents a single pattern item in a `Cases` list of a Case. It's formed by the pattern to match against and the corresponding set of statements to execute if it is matched.
 */
export type AstNodeCaseItem = AstNode & {
  type: 'CaseItem';
  pattern: AstNodeWord[];
  body: AstNodeCompoundList;
};

/**
 * A `If` statement. The if command shall execute a CompoundList and use its exit status to determine whether to execute the `then` CompoundList or the optional `else` one.
 */
export type AstNodeIf = AstNode & {
  type: 'If';
  clause: AstNodeCompoundList;
  then: AstNodeCompoundList;
  else?: AstNodeCompoundList;
};

/**
 * A `While` statement. The While loop shall continuously execute one CompoundList as long as another CompoundList has a zero exit status.
 */
export type AstNodeWhile = AstNode & {
  type: 'While';
  clause: AstNodeCompoundList;
  do: AstNodeCompoundList;
};

/**
 * A `Until` statement. The Until loop shall continuously execute one CompoundList as long as another CompoundList has a non-zero exit status.
 */
export type AstNodeUntil = AstNode & {
  type: 'Until';
  clause: AstNodeCompoundList;
  do: AstNodeCompoundList;
};

/** A `Redirect` represents the redirection of input or output stream of a command to or from a filename or another stream. */
export type AstNodeRedirect = AstNode & {
  type: 'Redirect';
  op: AstNodeWord;
  file: AstNodeWord;
  numberIo?: AstIoNumber;
};

/**
 * A `Word` node could appear various part of the AST. It's formed by a series of characters, and is subjected to `tilde expansion`, `parameter expansion`, `command substitution`, `arithmetic expansion`, `pathName expansion`, `field splitting` and `quote removal`.
 */
export type AstNodeWord = AstNode & {
  type: 'Word';
  text: string;
  expansion: Array<
    | AstArithmeticExpansion
    | AstCommandExpansion
    | AstParameterExpansion
    | AstPathExpansion
  >;
};

/**
 * A special kind of Word that represents assignment of a value to an environment variable.
 */
export type AstNodeAssignmentWord = AstNode & {
  type: 'AssignmentWord';
  text: string;
  expansion: Array<
    | AstArithmeticExpansion
    | AstCommandExpansion
    | AstParameterExpansion
    | AstPathExpansion
  >;
};

/**
 * A `ArithmeticExpansion` represent an arithmetic expansion operation to perform in the Word.
 *
 * The parsing of the arithmetic expression is done using [Babel parser](https://babeljs.io/docs/babel-parser). See there for the `arithmeticAST` node specification.
 *
 * The `loc.start` property contains the index of the character in the Word text where the substitution starts. The `loc.end` property contains the index where it the ends.
 */
export type AstArithmeticExpansion = {
  type: 'ArithmeticExpansion';
  resolved: boolean;
  loc: ExpansionLocation;

  expression: string;
  arithmeticAST: AstNode; // Maybe this should be specialized
};

/** A `CommandExpansion` represent a command substitution operation to perform on the Word.
 *
 * The parsing of the command is done recursively using `bash-parser` itself.
 *
 * The `loc.start` property contains the index of the character in the Word text where the substitution starts. The `loc.end` property contains the index where it the ends.
 */
export type AstCommandExpansion = {
  type: 'CommandExpansion';
  resolved: boolean;
  loc: ExpansionLocation;

  command: string;
  commandAST: AstNodeScript;
};

/**
 * A `ParameterExpansion` represent a parameter expansion operation to perform on the Word.
 *
 * The `op` and `Word` properties represents, in the case of special parameters, respectively the operator used and the right Word of the special parameter.
 *
 * The `loc.start` property contains the index of the character in the Word text where the substitution starts. The `loc.end` property contains the index where it the ends.
 */
export type AstParameterExpansion = {
  type: 'ParameterExpansion';
  resolved: boolean;
  loc: ExpansionLocation;

  parameter: string;
  kind?: string;
  word?: string;
  op?: string;
};

/**
 * A `PathExpansion` represents a glob pattern (pathname expansion) to be resolved at execution time.
 *
 * The `pattern` property contains the glob pattern (e.g., `[0-9][0-9]_*.sh`).
 *
 * The `loc.start` property contains the index of the character in the Word text where the pattern starts. The `loc.end` property contains the index where it ends.
 */
export type AstPathExpansion = {
  type: 'PathExpansion';
  resolved: boolean;
  loc: ExpansionLocation;

  pattern: string;
};

/**
 * Helper types
 */

export type AstIoNumber = AstNode & {
  type: 'io_number';
  text: string;
};
