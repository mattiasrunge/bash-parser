/**
 * AST types for arithmetic expressions.
 * Designed to be compatible with Babel's AST format for backwards compatibility.
 */

export type SourceLocation = {
  start: Position;
  end: Position;
};

export type Position = {
  line: number;
  column: number;
  index: number;
};

/**
 * Base type for all arithmetic AST nodes
 */
export type BaseNode = {
  type: string;
  start: number;
  end: number;
  loc: SourceLocation;
};

/**
 * Numeric literal: 42, 0xFF, 0777, 0b1010
 */
export type NumericLiteral = BaseNode & {
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
export type Identifier = BaseNode & {
  type: 'Identifier';
  name: string;
};

/**
 * Binary expression: a + b, a * b, a << b
 */
export type BinaryExpression = BaseNode & {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
};

export type BinaryOperator =
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
 * Babel separates these from BinaryExpression
 */
export type LogicalExpression = BaseNode & {
  type: 'LogicalExpression';
  operator: '&&' | '||';
  left: Expression;
  right: Expression;
};

/**
 * Unary expression: -x, !x, ~x
 */
export type UnaryExpression = BaseNode & {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  prefix: true;
  argument: Expression;
};

export type UnaryOperator = '-' | '+' | '!' | '~';

/**
 * Update expression: ++x, x++, --x, x--
 */
export type UpdateExpression = BaseNode & {
  type: 'UpdateExpression';
  operator: '++' | '--';
  prefix: boolean;
  argument: Identifier;
};

/**
 * Conditional (ternary) expression: a ? b : c
 */
export type ConditionalExpression = BaseNode & {
  type: 'ConditionalExpression';
  test: Expression;
  consequent: Expression;
  alternate: Expression;
};

/**
 * Assignment expression: a = b, a += b
 */
export type AssignmentExpression = BaseNode & {
  type: 'AssignmentExpression';
  operator: AssignmentOperator;
  left: Identifier;
  right: Expression;
};

export type AssignmentOperator =
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
export type SequenceExpression = BaseNode & {
  type: 'SequenceExpression';
  expressions: Expression[];
};

/**
 * Union type for all expression nodes
 */
export type Expression =
  | NumericLiteral
  | Identifier
  | BinaryExpression
  | LogicalExpression
  | UnaryExpression
  | UpdateExpression
  | ConditionalExpression
  | AssignmentExpression
  | SequenceExpression;
