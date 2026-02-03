import type { Enums } from '../../../modes/types.ts';
import IOFileOperators from './io-file-operators.ts';
import operators from './operators.ts';
import parameterOperators from './parameter-operators.ts';
import reservedWords from './reserved-words.ts';

const enums: Enums = {
  IOFileOperators,
  operators,
  parameterOperators,
  reservedWords,
};

export default enums;
