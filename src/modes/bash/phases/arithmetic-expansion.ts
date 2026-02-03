import { parseArithmetic } from '../../../arithmetic/mod.ts';
import { BashSyntaxError } from '../../../errors.ts';
import type { LexerPhase } from '../../../lexer/types.ts';
import type { Expansion, TokenIf, TokenLocation } from '../../../tokenizer/mod.ts';
import type { AstArithmeticCommandSubstitution, AstArithmeticExpression } from '../../../ast/types.ts';
import bashParser from '../../../parse.ts';
import map from '../../../utils/iterable/map.ts';

function parseArithmeticAST(xp: Expansion, tokenLoc?: TokenLocation) {
  // Calculate source offset for absolute positions in arithmetic AST
  // For $((expr)), the expression starts 3 characters after the expansion start (after "$((")
  let sourceOffset: number | undefined;
  if (tokenLoc?.start?.char !== undefined && xp.loc) {
    sourceOffset = tokenLoc.start.char + xp.loc.start + 3;
  }

  try {
    return parseArithmetic(xp.expression!, { sourceOffset });
  } catch (err) {
    if (err instanceof BashSyntaxError) {
      throw err;
    }
    throw new SyntaxError(`Cannot parse arithmetic expression "${xp.expression}": ${(err as Error).message}`);
  }
}

// Recursively walk the arithmetic AST to find and parse command substitutions
async function resolveCommandSubstitutions(node: AstArithmeticExpression): Promise<AstArithmeticExpression> {
  if (!node) return node;

  switch (node.type) {
    case 'CommandSubstitution': {
      const commandAST = await bashParser(node.command);
      return { ...node, commandAST } as AstArithmeticCommandSubstitution;
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const left = await resolveCommandSubstitutions(node.left);
      const right = await resolveCommandSubstitutions(node.right);
      return { ...node, left, right };
    }
    case 'UnaryExpression': {
      const argument = await resolveCommandSubstitutions(node.argument);
      return { ...node, argument };
    }
    case 'ConditionalExpression': {
      const test = await resolveCommandSubstitutions(node.test);
      const consequent = await resolveCommandSubstitutions(node.consequent);
      const alternate = await resolveCommandSubstitutions(node.alternate);
      return { ...node, test, consequent, alternate };
    }
    case 'AssignmentExpression': {
      const right = await resolveCommandSubstitutions(node.right);
      return { ...node, right };
    }
    case 'SequenceExpression': {
      const expressions = await Promise.all(node.expressions.map(resolveCommandSubstitutions));
      return { ...node, expressions };
    }
    case 'UpdateExpression':
    case 'NumericLiteral':
    case 'Identifier':
      return node;
    default:
      return node;
  }
}

const arithmeticExpansion: LexerPhase = () =>
  map(async (token: TokenIf) => {
    if (token.is('WORD') || token.is('ASSIGNMENT_WORD')) {
      if (!token.expansion || token.expansion.length === 0) {
        return token;
      }

      return token.setExpansion(
        await Promise.all(
          token.expansion.map(async (xp: Expansion) => {
            if (xp.type === 'ArithmeticExpansion') {
              const arithmeticAST = parseArithmeticAST(xp, token.loc);
              // Resolve any command substitutions in the arithmetic AST
              const resolvedAST = await resolveCommandSubstitutions(arithmeticAST);
              return Object.assign({}, xp, { arithmeticAST: resolvedAST });
            }
            return xp;
          }),
        ),
      );
    }
    return token;
  });

export default arithmeticExpansion;
