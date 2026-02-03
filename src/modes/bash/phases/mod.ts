import type { LexerPhases } from '../../../lexer/types.ts';
import aliasSubstitution from './alias-substitution.ts';
import arithmeticExpansionResolve from './arithmetic-expansion-resolve.ts';
import arithmeticExpansion from './arithmetic-expansion.ts';
import assignmentWord from './assignment-word.ts';
import bracketContext from './bracket-context.ts';
import commandExpansionResolve from './command-expansion-resolve.ts';
import commandExpansion from './command-expansion.ts';
import defaultNodeType from './default-node-type.ts';
import fieldSplitting from './field-splitting.ts';
import forNameVariable from './for-name-variable.ts';
import functionName from './function-name.ts';
import identifyMaybeSimpleCommands from './identify-maybe-simple-commands.ts';
import identifySimpleCommandNames from './identify-simplecommand-names.ts';
import ioNumber from './io-number.ts';
import linebreakIn from './linebreak-in.ts';
import newLineList from './new-line-list.ts';
import operatorTokens from './operator-tokens.ts';
import parenContext from './paren-context.ts';
import parameterExpansionResolve from './parameter-expansion-resolve.ts';
import parameterExpansion from './parameter-expansion.ts';
import pathExpansion from './path-expansion.ts';
import pathExpansionDetect from './path-expansion-detect.ts';
import quoteRemoval from './quote-removal.ts';
import reservedWords from './reserved-words.ts';
import separator from './separator.ts';
import syntaxerrorOnContinue from './syntaxerror-oncontinue.ts';
import tildeExpanding from './tilde-expanding.ts';

const rules: LexerPhases = {
  aliasSubstitution,
  arithmeticExpansion,
  arithmeticExpansionResolve,
  assignmentWord,
  bracketContext,
  commandExpansion,
  commandExpansionResolve,
  defaultNodeType,
  fieldSplitting,
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
  parameterExpansionResolve,
  pathExpansion,
  pathExpansionDetect,
  quoteRemoval,
  reservedWords,
  separator,
  syntaxerrorOnContinue,
  tildeExpanding,
};

export default rules;
