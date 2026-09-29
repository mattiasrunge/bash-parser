import { BashSyntaxError } from '../../../errors.ts';
import type { LexerPhase } from '../../../lexer/types.ts';
import type { Options } from '../../../types.ts';
import bashParser from '../../../parse.ts';
import type { Expansion, TokenIf } from '../../../tokenizer/mod.ts';
import map from '../../../utils/iterable/map.ts';

/**
 * A syntax error inside `$( … )`, told as bash tells it: on the line of the source it is on, and a
 * body that ends too soon is the `)` that ended it, `syntax error near unexpected token `)'`.
 */
const substitutionError = (err: unknown, xp: Expansion, token: TokenIf): unknown => {
  if (!(err instanceof BashSyntaxError) || !err.detail) return err;

  const before = token.value!.slice(0, xp.loc!.start);
  const firstRow = (token.loc?.start.row ?? 1) + (before.match(/\n/g)?.length ?? 0);
  const inner = err.location?.start.row ?? 1;
  const closer = token.value![xp.loc!.start - 1] === '`' ? '`' : ')';
  const ended = err.detail.kind === 'eof';
  const row = ended ? firstRow + ((xp.command ?? '').match(/\n/g)?.length ?? 0) : firstRow + inner - 1;
  const error = new BashSyntaxError(err.message, undefined, { start: { row } }, err);

  error.detail = ended ? { kind: 'token', token: closer } : err.detail;

  return error;
};

/** The rows of the here-documents in a substitution's tree moved to the source's, from the substitution's first. */
const shiftHereDocuments = (node: unknown, by: number): void => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) shiftHereDocuments(item, by);
    return;
  }

  const unterminated = (node as { heredoc?: { unterminated?: { line: number; endLine: number } } }).heredoc?.unterminated;

  if (unterminated) {
    unterminated.line += by;
    unterminated.endLine += by;
  }

  for (const value of Object.values(node)) shiftHereDocuments(value, by);
};

const setCommandExpansion = async (xp: Expansion, token: TokenIf, options: Options) => {
  // `$()` closes before a character of it arrives: an empty command
  let command = xp.command ?? '';

  if (token.value![xp.loc!.start - 1] === '`') {
    command = command.replace(/\\`/g, '`');
  }

  let commandAST;

  try {
    commandAST = await bashParser(command, { unterminatedHereDocuments: options.unterminatedHereDocuments, substitution: true });
  } catch (err) {
    throw substitutionError(err, xp, token);
  }

  // A here-document the substitution ends inside warns on the source's lines
  const firstRow = (token.loc?.start.row ?? 1) + (token.value!.slice(0, xp.loc!.start).match(/\n/g)?.length ?? 0);

  shiftHereDocuments(commandAST, firstRow - 1);

  // console.log(JSON.stringify({command, commandAST}, null, 4))
  return Object.assign({}, xp, { command, commandAST });
};

// RULE 5 - If the current character is an unquoted '$' or '`', the shell shall
// identify the start of any candidates for parameter expansion (Parameter Expansion),
// command substitution (Command Substitution), or arithmetic expansion (Arithmetic
// Expansion) from their introductory unquoted character sequences: '$' or "${", "$("
// or '`', and "$((", respectively.
const commandExpansion: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!token.expansion || token.expansion.length === 0) {
        return token;
      }

      return token.setExpansion(
        await Promise.all(
          token.expansion.map(async (xp: Expansion) => {
            if (xp.type === 'CommandExpansion' || xp.type === 'ProcessSubstitution') {
              return await setCommandExpansion(xp, token, ctx.resolvers);
            }

            return xp;
          }),
        ),
      );
    }
    return token;
  });

export default commandExpansion;
