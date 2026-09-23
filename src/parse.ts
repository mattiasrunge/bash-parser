import { astBuilder } from './ast/mod.ts';
import { BashSyntaxError, type ErrorLocation } from './errors.ts';
import { grammar } from './grammar/mod.ts';
import type { Mode, ModePlugin } from './modes/types.ts';
import type { Parse } from './types.ts';
import { positionFromOffset } from './utils/location.ts';
import { Lexer } from './lexer/mod.ts';
import type { HereDocument } from './tokenizer/mod.ts';
import type { AstNodeRedirect } from './ast/types.ts';
import modeBash from './modes/bash/mod.ts';
import modeWordExpansion from './modes/word-expansion/mod.ts';

interface JisonParseErrorHash {
  text?: string;
  token?: string;
  line?: number;
  loc?: {
    first_line?: number;
    last_line?: number;
    first_column?: number;
    last_column?: number;
  };
  expected?: string[];
}

const loadPlugin = (name: string): Mode => {
  const modes: Record<string, ModePlugin> = {
    'bash': modeBash,
    'word-expansion': modeWordExpansion,
  };

  const modePlugin = modes[name];

  if (modePlugin.inherits) {
    return modePlugin.init(loadPlugin(modePlugin.inherits));
  }

  return modePlugin.init();
};

/**
 * Give each here-document redirect its text. The parser reduces a redirect as soon as it has the
 * delimiter, which can be before the tokenizer reaches the body (`cat <<EOF | grep x`), so the
 * delimiter only carries an index and the text is attached once the whole input is read.
 */
const attachHereDocuments = (node: unknown, docs: HereDocument[]): void => {
  if (docs.length === 0 || !node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) attachHereDocuments(item, docs);
    return;
  }
  const record = node as Record<string, unknown>;
  const file = record.file as { heredoc?: number } | undefined;
  if (record.type === 'Redirect' && typeof file?.heredoc === 'number') {
    const doc = docs[file.heredoc];
    delete file.heredoc;
    if (doc) (record as AstNodeRedirect).heredoc = { body: doc.body, quoted: doc.quoted };
  }
  for (const value of Object.values(record)) attachHereDocuments(value, docs);
};

export const parse: Parse = async (sourceCode, options?) => {
  try {
    options = options || {};
    options.mode = options.mode || 'bash';

    const mode = loadPlugin(options.mode);
    const parser = new grammar.Parser();
    const lexer = new Lexer(mode, options);
    parser.lexer = lexer;
    parser.yy = astBuilder(options.insertLOC);

    const ast = await parser.parse(sourceCode);
    attachHereDocuments(ast, lexer.hereDocuments);
    return ast;
  } catch (err) {
    // Already a BashSyntaxError - ensure full source and complete location are attached
    if (err instanceof BashSyntaxError) {
      const syntaxErr = err as BashSyntaxError;
      // Update source if missing or if it's a partial source (e.g., arithmetic expression)
      const needsSource = sourceCode && syntaxErr.source !== sourceCode;
      const hasCharOffset = syntaxErr.location?.start?.char !== undefined;
      const needsRowCol = hasCharOffset &&
        (syntaxErr.location!.start.row === undefined || syntaxErr.location!.start.col === undefined);

      if (needsSource || needsRowCol) {
        let location = syntaxErr.location;

        // Compute row/col from char offset using the FULL source code
        if (needsRowCol && sourceCode && location?.start?.char !== undefined) {
          const pos = positionFromOffset(sourceCode, location.start.char);
          location = {
            start: pos,
            end: location.end,
          };
        }

        throw new BashSyntaxError(syntaxErr.message, sourceCode, location, syntaxErr.cause);
      }
      throw syntaxErr;
    }

    // Extract location from jison parser error hash if available
    const hash = (err as Error & { hash?: JisonParseErrorHash }).hash;
    let location: ErrorLocation | undefined;

    if (hash) {
      location = {
        start: {
          row: hash.line !== undefined ? hash.line + 1 : undefined, // Convert from 0-based
          col: hash.loc?.first_column !== undefined ? hash.loc.first_column + 1 : undefined,
        },
      };
      if (hash.loc?.last_line !== undefined) {
        location.end = {
          row: hash.loc.last_line + 1,
          col: hash.loc.last_column !== undefined ? hash.loc.last_column + 1 : undefined,
        };
      }
    }

    throw new BashSyntaxError((err as Error).message, sourceCode, location, err as Error);
  }
};

export default parse;
