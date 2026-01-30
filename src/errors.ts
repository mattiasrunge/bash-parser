/**
 * Unified error types for bash-parser syntax errors with location information.
 */

/**
 * Position information matching the AST format.
 */
export type ErrorPosition = {
  /** 1-indexed line number */
  row?: number;
  /** 1-indexed column number */
  col?: number;
  /** 0-indexed character offset from start of source */
  char?: number;
};

/**
 * Location range for errors, with start and optional end positions.
 */
export type ErrorLocation = {
  start: ErrorPosition;
  end?: ErrorPosition;
};

/**
 * A unified syntax error class for all bash-parser parsing errors.
 * Extends SyntaxError so existing catch blocks continue to work.
 */
export class BashSyntaxError extends SyntaxError {
  override readonly name = 'BashSyntaxError';

  /** The source code being parsed (if available) */
  readonly source?: string;

  /** Location where the error occurred */
  readonly location?: ErrorLocation;

  /** The original cause (for error chaining) */
  override readonly cause?: Error;

  constructor(message: string, source?: string, location?: ErrorLocation, cause?: Error) {
    // Don't add location to message - let callers format it to avoid duplicates when re-throwing
    super(message);
    this.source = source;
    this.location = location;
    this.cause = cause;
  }

  /**
   * Format error message with location information.
   * Call this when you want a formatted message for display.
   */
  getFormattedMessage(): string {
    if (!this.location?.start) {
      return this.message;
    }

    const { row, col, char } = this.location.start;

    if (row !== undefined && col !== undefined) {
      return `${this.message} at line ${row}, column ${col}`;
    }

    if (char !== undefined) {
      return `${this.message} at offset ${char}`;
    }

    return this.message;
  }

  /**
   * Create error from a single position (convenience method).
   */
  static fromPosition(message: string, source: string, position: ErrorPosition): BashSyntaxError {
    return new BashSyntaxError(message, source, { start: position });
  }

  /**
   * Get a code snippet showing the error location.
   * Returns undefined if source is not available.
   */
  getCodeSnippet(contextLines: number = 2): string | undefined {
    if (!this.source || !this.location?.start) {
      return undefined;
    }

    const lines = this.source.split('\n');
    const errorLine = this.location.start.row ?? this.getLineFromOffset(this.location.start.char);

    if (!errorLine || errorLine < 1 || errorLine > lines.length) {
      return undefined;
    }

    const startLine = Math.max(1, errorLine - contextLines);
    const endLine = Math.min(lines.length, errorLine + contextLines);

    const snippetLines: string[] = [];
    const lineNumWidth = String(endLine).length;

    for (let i = startLine; i <= endLine; i++) {
      const lineNum = String(i).padStart(lineNumWidth, ' ');
      const prefix = i === errorLine ? '>' : ' ';
      snippetLines.push(`${prefix} ${lineNum} | ${lines[i - 1]}`);

      if (i === errorLine && (this.location.start.col !== undefined || this.location.start.char !== undefined)) {
        const pointer = ' '.repeat(lineNumWidth + 4 + (this.location.start.col ?? this.location.start.char ?? 0) - 1) + '^';
        snippetLines.push(pointer);
      }
    }

    return snippetLines.join('\n');
  }

  /**
   * Calculate line number from character offset.
   */
  private getLineFromOffset(offset?: number): number | undefined {
    if (!this.source || offset === undefined) return undefined;

    let line = 1;
    for (let i = 0; i < offset && i < this.source.length; i++) {
      if (this.source[i] === '\n') {
        line++;
      }
    }
    return line;
  }
}
