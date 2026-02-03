import type { AstBuilder } from '../ast/builder-if.ts';
import type { AstNodeScript } from '../ast/types.ts';

export interface LexerIf {
  yytext?: any;
  yylineno: number;
  setInput(source: string): void;
  lex(): Promise<string | undefined>;
}

export interface ParserIf {
  lexer: LexerIf;
  yy: AstBuilder;
  parse(source: string): AstNodeScript;
}

export type Grammar = {
  Parser: new () => ParserIf;
};
