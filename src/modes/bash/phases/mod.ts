import type { LexerPhases } from '../../../lexer/types.ts';
import aliasSubstitution from './alias-substitution.ts';
import arithmeticExpansion from './arithmetic-expansion.ts';
import assignmentWord from './assignment-word.ts';
import bracketContext from './bracket-context.ts';
import braceExpansion from './brace-expansion.ts';
import casePatterns from './case-patterns.ts';
import commandExpansion from './command-expansion.ts';
import defaultNodeType from './default-node-type.ts';
import forNameVariable from './for-name-variable.ts';
import functionName from './function-name.ts';
import identifyMaybeSimpleCommands from './identify-maybe-simple-commands.ts';
import identifySimpleCommandNames from './identify-simplecommand-names.ts';
import ioNumber from './io-number.ts';
import linebreakIn from './linebreak-in.ts';
import newLineList from './new-line-list.ts';
import operatorTokens from './operator-tokens.ts';
import parenContext from './paren-context.ts';
import parameterExpansion from './parameter-expansion.ts';
import pathExpansionDetect from './path-expansion-detect.ts';
import quoteRemoval from './quote-removal.ts';
import reservedWords from './reserved-words.ts';
import separator from './separator.ts';
import syntaxerrorOnContinue from './syntaxerror-oncontinue.ts';
import tildeExpanding from './tilde-expanding.ts';

const rules: LexerPhases = {
  aliasSubstitution,
  arithmeticExpansion,
  assignmentWord,
  braceExpansion,
  bracketContext,
  casePatterns,
  commandExpansion,
  defaultNodeType,
  forNameVariable,
  functionName,
  identifyMaybeSimpleCommands,
  identifySimpleCommandNames,
  ioNumber,
  linebreakIn,
  newLineList,
  operatorTokens,
  parenContext,
  parameterExpansion,
  pathExpansionDetect,
  quoteRemoval,
  reservedWords,
  separator,
  syntaxerrorOnContinue,
  tildeExpanding,
};

export default rules;
