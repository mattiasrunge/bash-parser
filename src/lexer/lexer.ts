import type { LexerIf } from '../grammar/mod.ts';
import type { LexerContext, LexerPhaseFn } from '../lexer/types.ts';
import type { Mode } from '../modes/types.ts';
import { type HereDocument, type TokenIf, tokenize, type Tokenizer } from '../tokenizer/mod.ts';
import type { Options } from '../types.ts';
import compose from '../utils/iterable/compose.ts';
import { writtenText } from '../utils/written.ts';

export class Lexer implements LexerIf {
  private tokenizer: Tokenizer;
  private tokens?: AsyncIterable<TokenIf>;
  private insertLOC: boolean;
  /** The here-documents of the input being parsed, in order; the delimiters' `heredoc` indexes into it. */
  public hereDocuments: HereDocument[] = [];
  public yytext?: any;
  /**
   * The token handed to the parser last: the one a syntax error is about. A holder rather than a
   * field, since jison lexes with `Object.create(lexer)`, and a field set there would stay there.
   */
  public readonly last: { token?: { type: string; text: string; row?: number } } = {};
  public yylineno: number = 0;

  constructor(mode: Mode, options: Options) {
    const tokenizerPhase: LexerPhaseFn = tokenize(
      mode.reducers,
      mode.enums.operators,
      this.hereDocuments,
      options.unterminatedHereDocuments,
      options.substitution,
      options.posix,
    );

    let previousPhases: LexerPhaseFn[] = [
      tokenizerPhase,
    ];

    const phases = [tokenizerPhase];

    for (const phase of mode.lexerPhases) {
      const ctx: LexerContext = {
        resolvers: options,
        enums: mode.enums,
        previousPhases,
      };

      const ph = phase(ctx);
      previousPhases = [...previousPhases, ph];
      phases.push(ph);
    }

    this.tokenizer = compose<TokenIf>(...phases.reverse());
    this.insertLOC = !!options.insertLOC;
  }

  setInput(source: string) {
    this.hereDocuments.length = 0;
    this.tokens = this.tokenizer(source);
  }

  async lex() {
    const iterator = this.tokens![Symbol.asyncIterator]();
    const item = await iterator.next();

    // Asked again past the end — a `case` left open makes the parser look once
    // more for what could follow it — it is still the end
    if (item.done || !item.value) {
      this.yytext = { text: '', type: '' };
      return 'EOF';
    }

    const tk: TokenIf = item.value;

    const tkType = tk.ctx.originalType;
    const text = tk.value;

    this.last.token = { type: tkType ?? '', text: text ?? '', row: tk.loc?.start.row };

    this.yytext = { text, type: '' };
    if (tk.expansion) {
      this.yytext.expansion = tk.expansion;
    }

    if (tk.type) {
      this.yytext.type = tk.type;
    }

    if (tk.originalText) {
      this.yytext.originalText = tk.originalText;
    }

    if (tk.joined) {
      this.yytext.joined = tk.joined;
    }

    // Out of sight of the AST's words: read only by `[[ ]]`, for an arithmetic operand
    if (tk.ctx.written !== undefined) {
      writtenText.set(this.yytext, tk.ctx.written);
    }

    if (tk.ctx.heredoc !== undefined) {
      this.yytext.heredoc = tk.ctx.heredoc;
    }

    if (tk.fieldIdx !== undefined) {
      this.yytext.fieldIdx = tk.fieldIdx;
    }

    if (this.insertLOC && tk.loc) {
      this.yytext.loc = tk.loc;
    }

    // `((` and `))` say where they are whatever the options, so that the
    // command between them keeps its text as written: bash reads it as a string
    if ((tkType === 'DOUBLE_OPEN_PAREN' || tkType === 'DOUBLE_CLOSE_PAREN') && tk.loc?.start.char !== undefined) {
      this.yytext.span = [tk.loc.start.char, tk.loc.end.char!];
    }

    if (tk.loc) {
      this.yylineno = tk.loc.start.row! - 1;
    }

    return tkType;
  }
}
