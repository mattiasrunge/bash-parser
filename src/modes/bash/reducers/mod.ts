import type { Reducers } from '../../../tokenizer/types.ts';
import comment from './comment.ts';
import doubleQuoting from './double-quoting.ts';
import end from './end.ts';
import expansionArithmetic from './expansion-arithmetic.ts';
import expansionCommandOrArithmetic from './expansion-command-or-arithmetic.ts';
import expansionCommandTick from './expansion-command-tick.ts';
import expansionParameterExtended from './expansion-parameter-extended.ts';
import expansionParameter from './expansion-parameter.ts';
import expansionSpecialParameter from './expansion-special-parameter.ts';
import expansionStart from './expansion-start.ts';
import operator from './operator.ts';
import singleQuoting from './single-quoting.ts';
import start from './start.ts';

const reducers: Reducers = {
  end,
  operator,
  comment,
  singleQuoting,
  doubleQuoting,
  expansionStart,
  expansionCommandTick,
  start,
  expansionArithmetic,
  expansionSpecialParameter,
  expansionParameter,
  expansionCommandOrArithmetic,
  expansionParameterExtended,
};

export default reducers;
