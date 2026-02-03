import type { TokenIf } from '../tokenizer/types.ts';

const loggerPhase = (name: string) => () => (async function* (tokens: TokenIf[]) {
  console.log('tokens', tokens);
  for await (const tk of tokens) {
    if (!tk) {
      console.log(`In ${name} token null.`);
    }
    console.log(
      name,
      '<<<',
      tk,
      '>>>',
    );
    yield tk;
  }
});

export default loggerPhase;
