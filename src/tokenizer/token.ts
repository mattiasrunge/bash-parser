import deepCopy from '../utils/deep-copy.ts';
import type { Expansion, ProtectedRange, TokenContext, TokenFields, TokenIf, TokenLocation } from './types.ts';

class Token implements TokenIf {
  type: string = '';
  ctx: TokenContext = {};
  value: string;
  loc?: TokenLocation;
  expansion?: Expansion[];
  protectedRanges?: ProtectedRange[];

  constructor(fields: Partial<Pick<TokenFields, 'ctx'>> & Omit<TokenFields, 'ctx'>) {
    this.type = fields.type;
    this.value = fields.value;
    this.ctx = fields.ctx || {};
    this.loc = fields.loc;
    this.expansion = fields.expansion;
    this.expansion = (fields.expansion && fields.expansion.length) ? fields.expansion : undefined;
    this.protectedRanges = fields.protectedRanges;
  }

  is(type: string) {
    return this.type === type;
  }

  clone(fields: Partial<TokenIf>): TokenIf {
    return new Token({
      ...deepCopy(this),
      ...fields,
    });
  }

  setType(type: string) {
    return this.clone({ type });
  }

  setValue(value: string) {
    return this.clone({ value });
  }

  appendValue(chunk: string): TokenIf {
    return this.clone({ value: this.value + chunk });
  }

  setExpansion(expansion: Expansion[]) {
    return this.clone({ expansion });
  }
}

export const mkToken = (
  type: string,
  value?: string,
  fields?: Partial<Omit<TokenFields, 'type' | 'value'>>,
): TokenIf => {
  return new Token({
    type,
    value: value || '',
    ...(fields || {}),
  });
};
