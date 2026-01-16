import type { LexerPhase } from '~/lexer/types.ts';
import bashParser from '~/parse.ts';
import type { Expansion, TokenIf } from '~/tokenizer/mod.ts';
import map from '~/utils/iterable/map.ts';

const setCommandExpansion = async (xp: Expansion, token: TokenIf) => {
  let command = xp.command!;

  if (token.value![xp.loc!.start - 1] === '`') {
    command = command.replace(/\\`/g, '`');
  }

  const commandAST = await bashParser(command);

  // console.log(JSON.stringify({command, commandAST}, null, 4))
  return Object.assign({}, xp, { command, commandAST });
};

// RULE 5 - If the current character is an unquoted '$' or '`', the shell shall
// identify the start of any candidates for parameter expansion (Parameter Expansion),
// command substitution (Command Substitution), or arithmetic expansion (Arithmetic
// Expansion) from their introductory unquoted character sequences: '$' or "${", "$("
// or '`', and "$((", respectively.
const commandExpansion: LexerPhase = () =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!token.expansion || token.expansion.length === 0) {
        return token;
      }

      return token.setExpansion(
        await Promise.all(
          token.expansion.map(async (xp: Expansion) => {
            if (xp.type === 'CommandExpansion') {
              return await setCommandExpansion(xp, token);
            }

            return xp;
          }),
        ),
      );
    }
    return token;
  });

export default commandExpansion;
