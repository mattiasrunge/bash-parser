import type { ExpansionLocation } from '../tokenizer/types.ts';

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
  /**
   * The node was terminated by `&` and runs in the background. It sits on the
   * base type because `&` applies to whatever precedes it — a list, a group, a
   * loop or a subshell just as much as a single command — and the builder marks
   * the last node of the list whatever its type.
   */
  async?: boolean;
  /**
   * `! cmd` inverts the exit status. It sits on the base type for the same
   * reason as `async`: a pipeline of one command is unwrapped, so the bang lands
   * on whatever that command is — a group, a loop or a subshell as well.
   */
  bang?: boolean;
  /**
   * `time cmd`: the shell reports how long the pipeline took, in `TIMEFORMAT`,
   * or in POSIX's fixed format after `time -p`. `time` on its own times an empty
   * command. Like the bang it lands on the command a one-command pipeline unwraps to.
   */
  time?: { posix: boolean };
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
    | AstNodeArithmeticCommand
    | AstNodeConditionalCommand
    | AstNodeFor
    | AstNodeSelect
    | AstNodeArithmeticFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
    | AstNodeCoproc
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
    | AstNodeArithmeticCommand
    | AstNodeConditionalCommand
    | AstNodeFor
    | AstNodeSelect
    | AstNodeArithmeticFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
    | AstNodeCoproc
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
};

/**
 * `Coproc` runs a command in the background with two pipes to it, `coproc cat`
 * or `coproc NAME { … }`: the shell reads the command's output from the file
 * descriptor in `NAME[0]`, writes its input to the one in `NAME[1]`, and has its
 * process id in `NAME_PID`. `name` is `COPROC` unless one was given, which bash
 * takes only before a compound command.
 */
export type AstNodeCoproc = AstNode & {
  type: 'Coproc';
  name: string;
  body: AstNode;
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
    | AstNodeArithmeticCommand
    | AstNodeConditionalCommand
    | AstNodeFor
    | AstNodeSelect
    | AstNodeArithmeticFor
    | AstNodeCase
    | AstNodeIf
    | AstNodeWhile
    | AstNodeUntil
    | AstNodeCoproc
  >;
  redirections?: AstNodeRedirect[];
};

/**
 * `Subshell` node represents a Subshell command. It consist of a group of one or more commands to execute in a separated shell environment.
 */
export type AstNodeSubshell = AstNode & {
  type: 'Subshell';
  list: AstNodeCompoundList;
  /** `( … ) 2>&1`: in place for the whole subshell */
  redirections?: AstNodeRedirect[];
};

/**
 * `ArithmeticCommand` node represents the (( expression )) compound command.
 * It evaluates the arithmetic expression and returns exit status 0 if the result is non-zero, 1 otherwise.
 */
export type AstNodeArithmeticCommand = AstNode & {
  type: 'ArithmeticCommand';
  expression: string;
  /** Absent when the text is not arithmetic as written: bash parses it only after expansion, at run time. */
  arithmeticAST?: AstArithmeticExpression;
};

/**
 * `ConditionalCommand` node represents the [[ expression ]] compound command.
 * It evaluates the conditional expression and returns exit status 0 if true, 1 otherwise.
 */
export type AstNodeConditionalCommand = AstNode & {
  type: 'ConditionalCommand';
  expression: string;
  conditionAST: AstConditionalExpression;
};

/**
 * Conditional expression types for [[ ... ]] syntax.
 */

/**
 * Union type for all conditional expression nodes.
 */
export type AstConditionalExpression =
  | AstConditionalBinaryExpression
  | AstConditionalUnaryExpression
  | AstConditionalLogicalExpression
  | AstConditionalNegation
  | AstConditionalWord;

/**
 * Binary conditional expression: "$a" == "$b", $x -eq 10, file1 -nt file2
 */
export type AstConditionalBinaryExpression = AstNode & {
  type: 'ConditionalBinaryExpression';
  operator: string;
  left: AstConditionalWord;
  right: AstConditionalWord;
};

/**
 * Unary conditional expression: -f file, -z "$var"
 */
export type AstConditionalUnaryExpression = AstNode & {
  type: 'ConditionalUnaryExpression';
  operator: string;
  argument: AstConditionalWord;
};

/**
 * Logical conditional expression: cond1 && cond2, cond1 || cond2
 */
export type AstConditionalLogicalExpression = AstNode & {
  type: 'ConditionalLogicalExpression';
  operator: '&&' | '||';
  left: AstConditionalExpression;
  right: AstConditionalExpression;
};

/**
 * Negation in conditional expression: ! cond
 */
export type AstConditionalNegation = AstNode & {
  type: 'ConditionalNegation';
  argument: AstConditionalExpression;
};

/**
 * Word/operand in conditional expression (preserves expansion info).
 */
export type AstConditionalWord = AstNode & {
  type: 'ConditionalWord';
  text: string;
  /** The word as written, quotes and all, when that is not `text` */
  written?: string;
  expansion?: Array<
    | AstArithmeticExpansion
    | AstCommandExpansion
    | AstProcessSubstitution
    | AstParameterExpansion
    | AstPathExpansion
    | AstTildeExpansion
  >;
};

/**
 * A `For` statement. The for loop shall execute a sequence of commands for each member in a list of items.
 */
export type AstNodeFor = AstNode & {
  type: 'For';
  name: AstNodeWord;
  wordlist?: AstNodeWord[];
  do: AstNodeCompoundList;
  /** Redirections applied to the whole command, `while … done < file` */
  redirections?: AstNodeRedirect[];
};

/**
 * `select name in words; do …; done`: a menu of the words on stderr, a line
 * read from stdin for each pass, `name` set to the chosen word and `REPLY` to
 * the line. Without `in`, the words are the positional parameters.
 */
export type AstNodeSelect = AstNode & {
  type: 'Select';
  name: AstNodeWord;
  wordlist?: AstNodeWord[];
  do: AstNodeCompoundList;
  redirections?: AstNodeRedirect[];
};

/**
 * One of the three expressions of an `ArithmeticFor`, as written and parsed.
 */
export type AstArithmeticForPart = {
  expression: string;
  /** Absent when the text is not arithmetic as written: bash parses it only after expansion, at run time. */
  arithmeticAST?: AstArithmeticExpression;
};

/**
 * `for (( init; test; update )); do …; done`: `init` runs once, then while `test` is non-zero the
 * body runs and `update` after it. Each part may be left out, as in bash; a missing `test` is true.
 */
export type AstNodeArithmeticFor = AstNode & {
  type: 'ArithmeticFor';
  init?: AstArithmeticForPart;
  test?: AstArithmeticForPart;
  update?: AstArithmeticForPart;
  do: AstNodeCompoundList;
  /** Redirections applied to the whole command, `for (( … )); do …; done > file` */
  redirections?: AstNodeRedirect[];
};

/**
 * A `Case` statement. The conditional construct Case shall execute the CompoundList corresponding to the first one of several patterns that is matched by the `clause` Word.
 */

export type AstNodeCase = AstNode & {
  type: 'Case';
  clause: AstNodeWord;
  cases?: AstNodeCaseItem[];
  /** Redirections applied to the whole command, `while … done < file` */
  redirections?: AstNodeRedirect[];
};

/**
 * `CaseItem` represents a single pattern item in a `Cases` list of a Case. It's formed by the pattern to match against and the corresponding set of statements to execute if it is matched.
 */
export type AstNodeCaseItem = AstNode & {
  type: 'CaseItem';
  pattern: AstNodeWord[];
  body: AstNodeCompoundList;
  /**
   * How the item ends when it is not `;;`: `;&` runs the next item's commands
   * as well, without testing its patterns; `;;&` goes on testing the patterns
   * of the items after it.
   */
  terminator?: ';&' | ';;&';
};

/**
 * A `If` statement. The if command shall execute a CompoundList and use its exit status to determine whether to execute the `then` CompoundList or the optional `else` one.
 */
export type AstNodeIf = AstNode & {
  type: 'If';
  clause: AstNodeCompoundList;
  then: AstNodeCompoundList;
  else?: AstNodeCompoundList;
  /** Redirections applied to the whole command, `while … done < file` */
  redirections?: AstNodeRedirect[];
};

/**
 * A `While` statement. The While loop shall continuously execute one CompoundList as long as another CompoundList has a zero exit status.
 */
export type AstNodeWhile = AstNode & {
  type: 'While';
  clause: AstNodeCompoundList;
  do: AstNodeCompoundList;
  /** Redirections applied to the whole command, `while … done < file` */
  redirections?: AstNodeRedirect[];
};

/**
 * A `Until` statement. The Until loop shall continuously execute one CompoundList as long as another CompoundList has a non-zero exit status.
 */
export type AstNodeUntil = AstNode & {
  type: 'Until';
  clause: AstNodeCompoundList;
  do: AstNodeCompoundList;
  /** Redirections applied to the whole command, `while … done < file` */
  redirections?: AstNodeRedirect[];
};

/** A `Redirect` represents the redirection of input or output stream of a command to or from a filename or another stream. */
export type AstNodeRedirect = AstNode & {
  type: 'Redirect';
  op: AstNodeWord;
  /** The file — or for `<<` and `<<-`, the delimiter word. */
  file: AstNodeWord;
  numberIo?: AstIoNumber;
  /** For `<<` and `<<-`: the here-document's text. */
  heredoc?: AstHereDocument;
};

/**
 * The text of a here-document, `cat <<EOF` … `EOF`. With the delimiter quoted anywhere (`<<'EOF'`)
 * the body is literal; otherwise parameter, command and arithmetic expansion apply to it when it is
 * used, as inside double quotes, but quotes in it are ordinary characters.
 */
export type AstHereDocument = {
  body: string;
  quoted: boolean;
  /**
   * The input ended before the delimiter, with `unterminatedHereDocuments: 'end'`: bash takes the
   * rest as the body and warns, `here-document at line <line> delimited by end-of-file (wanted
   * `<delimiter>')`, on the input's last line, `endLine`.
   */
  unterminated?: { delimiter: string; line: number; endLine: number };
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
    | AstProcessSubstitution
    | AstParameterExpansion
    | AstPathExpansion
    | AstTildeExpansion
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
    | AstProcessSubstitution
    | AstParameterExpansion
    | AstPathExpansion
    | AstTildeExpansion
  >;
};

/**
 * A `ArithmeticExpansion` represent an arithmetic expansion operation to perform in the Word.
 *
 * The `loc.start` property contains the index of the character in the Word text where the substitution starts. The `loc.end` property contains the index where it the ends.
 */
export type AstArithmeticExpansion = {
  type: 'ArithmeticExpansion';
  resolved: boolean;
  loc: ExpansionLocation;

  expression: string;
  /** Absent when the text is not arithmetic as written: bash parses it only after expansion, at run time. */
  arithmeticAST?: AstArithmeticExpression;
};

/** A `CommandExpansion` represent a command substitution operation to perform on the Word.
 *
 * The parsing of the command is done recursively using `bash-parser` itself.
 *
 * The `loc.start` property contains the index of the character in the Word text where the substitution starts. The `loc.end` property contains the index where it the ends.
 */
/**
 * A `ProcessSubstitution` represents `<(cmd)` or `>(cmd)`. The command runs on
 * its own and the word expands to something the command can open: `direction`
 * says whether the substituted command writes ('in') or reads ('out').
 */
export type AstProcessSubstitution = {
  type: 'ProcessSubstitution';
  resolved: boolean;
  loc: ExpansionLocation;

  direction: 'in' | 'out';
  command: string;
  commandAST: AstNodeScript;
};

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
 * A `TildeExpansion` is a tilde prefix left for the caller to expand when it
 * runs the word (the `deferTildeExpansion` option): `value` is what follows
 * the `~` — `''`, a user name, `+`, `-`, or a directory stack index.
 */
export type AstTildeExpansion = {
  type: 'TildeExpansion';
  resolved?: boolean;
  loc: ExpansionLocation;

  value: string;
};

/**
 * Arithmetic expression types
 * These represent parsed arithmetic expressions within $((...)) syntax.
 */

/**
 * Numeric literal: 42, 0xFF, 0777, 0b1010
 */
export type AstArithmeticNumericLiteral = AstNode & {
  type: 'NumericLiteral';
  value: number;
  extra: {
    rawValue: number;
    raw: string;
  };
};

/**
 * Identifier (variable reference): var or $var
 */
export type AstArithmeticIdentifier = AstNode & {
  type: 'Identifier';
  name: string;
  /**
   * An array element, `a[…]`: the text between the brackets. An indexed array
   * evaluates it as arithmetic, an associative one uses it as a key — which
   * the executor knows and the parser does not.
   */
  subscript?: string;
  /** The subscript parsed as arithmetic, when it is arithmetic as written. */
  index?: AstArithmeticExpression;
};

/**
 * Binary expression: a + b, a * b, a << b
 */
export type AstArithmeticBinaryExpression = AstNode & {
  type: 'BinaryExpression';
  operator: AstArithmeticBinaryOperator;
  left: AstArithmeticExpression;
  right: AstArithmeticExpression;
};

export type AstArithmeticBinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '**'
  | '&'
  | '|'
  | '^'
  | '<<'
  | '>>'
  | '<'
  | '>'
  | '<='
  | '>='
  | '=='
  | '!='
  | '&&'
  | '||';

/**
 * Logical expression: a && b, a || b
 */
export type AstArithmeticLogicalExpression = AstNode & {
  type: 'LogicalExpression';
  operator: '&&' | '||';
  left: AstArithmeticExpression;
  right: AstArithmeticExpression;
};

/**
 * Unary expression: -x, !x, ~x
 */
export type AstArithmeticUnaryExpression = AstNode & {
  type: 'UnaryExpression';
  operator: AstArithmeticUnaryOperator;
  prefix: true;
  argument: AstArithmeticExpression;
};

export type AstArithmeticUnaryOperator = '-' | '+' | '!' | '~';

/**
 * Update expression: ++x, x++, --x, x--
 */
export type AstArithmeticUpdateExpression = AstNode & {
  type: 'UpdateExpression';
  operator: '++' | '--';
  prefix: boolean;
  argument: AstArithmeticIdentifier;
};

/**
 * Conditional (ternary) expression: a ? b : c
 */
export type AstArithmeticConditionalExpression = AstNode & {
  type: 'ConditionalExpression';
  test: AstArithmeticExpression;
  consequent: AstArithmeticExpression;
  alternate: AstArithmeticExpression;
};

/**
 * Assignment expression: a = b, a += b
 */
export type AstArithmeticAssignmentExpression = AstNode & {
  type: 'AssignmentExpression';
  operator: AstArithmeticAssignmentOperator;
  left: AstArithmeticIdentifier;
  right: AstArithmeticExpression;
};

export type AstArithmeticAssignmentOperator =
  | '='
  | '+='
  | '-='
  | '*='
  | '/='
  | '%='
  | '&='
  | '|='
  | '^='
  | '<<='
  | '>>=';

/**
 * Sequence expression (comma operator): a, b, c
 */
export type AstArithmeticSequenceExpression = AstNode & {
  type: 'SequenceExpression';
  expressions: AstArithmeticExpression[];
};

/**
 * Command substitution within arithmetic: $(echo 5)
 * This represents a command substitution that needs to be evaluated
 * and its output used as a numeric value in the arithmetic expression.
 */
export type AstArithmeticCommandSubstitution = AstNode & {
  type: 'CommandSubstitution';
  command: string;
  commandAST?: AstNodeScript;
};

/**
 * `${…}` inside an arithmetic expression: `text` as written, `word` the same text parsed as a
 * shell word (filled in after parsing), which the executor expands and evaluates as a number —
 * or, when the expansion is not a number, as an arithmetic expression of its own.
 */
export type AstArithmeticParameterExpansion = AstNode & {
  type: 'ParameterExpansion';
  text: string;
  word?: AstNodeWord;
};

/**
 * Union type for all arithmetic expression nodes
 */
export type AstArithmeticExpression =
  | AstArithmeticNumericLiteral
  | AstArithmeticIdentifier
  | AstArithmeticBinaryExpression
  | AstArithmeticLogicalExpression
  | AstArithmeticUnaryExpression
  | AstArithmeticUpdateExpression
  | AstArithmeticConditionalExpression
  | AstArithmeticAssignmentExpression
  | AstArithmeticSequenceExpression
  | AstArithmeticCommandSubstitution
  | AstArithmeticParameterExpansion;

/**
 * Helper types
 */

export type AstIoNumber = AstNode & {
  type: 'io_number';
  text: string;
};
