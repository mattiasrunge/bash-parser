import type { AstNodeCommand } from '../../../ast/types.ts';
import type { LexerPhase } from '../../../lexer/types.ts';
import type { Enums, ParameterOp } from '../../../modes/types.ts';
import bashParser from '../../../parse.ts';
import type { Expansion, TokenIf } from '../../../tokenizer/mod.ts';
import deepCopy from '../../../utils/deep-copy.ts';
import map from '../../../utils/iterable/map.ts';

const handleParameter = async (obj: ParameterOp, match: RegExpMatchArray) => {
  const ret = Object.fromEntries(
    await Promise.all(
      Object.entries(obj).map(async ([k, v]) => {
        if (typeof v === 'function') {
          const val = v(match);
          return [k, val];
        }

        if (typeof v === 'object' && k !== 'expand') {
          // TODO: This as seems funky
          return [k, await handleParameter(v as unknown as ParameterOp, match)];
        }

        return [k, v];
      }),
    ),
  ) as ParameterOp;

  if (ret.expand) {
    for (const prop of ret.expand as string[]) {
      const source = (ret[prop] ?? '') as string;
      const ast = await bashParser(source, { mode: 'word-expansion' }).catch(() => undefined);

      // An empty word parses to no command at all — `${x:-}` and `${x:?}` are
      // written that way on purpose, so the word is simply absent rather than
      // something to read a name off. One that is no word on its own, the `'`
      // of `"${x+'}"` in POSIX mode, is what it is written as.
      (ret as any)[prop] = ast ? (ast.commands[0] as AstNodeCommand | undefined)?.name : { type: 'Word', text: source };
      // As written, quotes and all: a word without expansions comes out of
      // parsing with its quotes removed, and whether it was quoted still matters
      (ret as any)[`${prop}Source`] = ret[prop] === undefined ? undefined : source;
    }

    delete ret.expand;
  }

  return ret;
};

/** Stands for `#` while the operators are matched: an identifier no script writes. */
const POUND = '__bash_parser_pound__';

const expandParameter = async (xp: Expansion, enums: Enums): Promise<Expansion> => {
  let parameter = xp.parameter!;
  // `${#-x}`, `${#:-x}`, `${#%2}` are $# with an operator; `${#x}`, `${#-}`,
  // `${##}` alone are a length, as bash reads them
  // `${#foo%}` stays the bad substitution it is: an operator has to follow the `#`
  const pound = parameter.length > 2 && parameter[0] === '#' && ':-=?+%#/^,@'.includes(parameter[1]) &&
    !/^#(?:[a-zA-Z_][a-zA-Z0-9_]*(?:\[.*\])?|[0-9]+|[@*?$!#-])$/s.test(parameter);

  if (pound) parameter = POUND + parameter.slice(1);

  for (const pair of Object.entries(enums.parameterOperators)) {
    // A word may run over lines, `${x+a
    // b}`: `.` takes newlines too
    const re = new RegExp(pair[0], 's');
    const match = parameter.match(re);

    if (match) {
      const opProps = await handleParameter(pair[1], match);

      if (pound && opProps.parameter === POUND) opProps.parameter = '#';

      const mergedObject = Object.assign({}, xp, opProps);

      return deepCopy(mergedObject);
    }
  }

  return xp;
};

/**
 * RULE 5 - If the current character is an unquoted '$' or '`',
 * the shell shall identify the start of any candidates for
 * parameter expansion (Parameter Expansion), command substitution
 * (Command Substitution), or arithmetic expansion (Arithmetic
 * Expansion) from their introductory unquoted character sequences:
 * '$' or "${", "$(" * or '`', and "$((", respectively.
 */
const parameterExpansion: LexerPhase = (ctx) =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!token.expansion || token.expansion.length === 0) {
        return token;
      }

      return token.setExpansion(
        await Promise.all(
          token.expansion!.map(async (xp: Expansion) => {
            if (xp.type === 'ParameterExpansion') {
              return await expandParameter(xp, ctx.enums);
            }

            return xp;
          }),
        ),
      );
    }
    return token;
  });

export default parameterExpansion;
