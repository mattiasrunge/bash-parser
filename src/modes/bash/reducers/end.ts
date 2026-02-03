import { mkToken, type Reducer } from '../../../tokenizer/mod.ts';

const end: Reducer = () => {
  return {
    nextReduction: null,
    tokensToEmit: [mkToken('EOF')],
  };
};

export default end;
