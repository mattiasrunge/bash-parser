import { assertEquals } from '@std/assert';
import { applyVisitor } from '~/tokenizer/apply-visitor.ts';
import { mkToken } from '~/tokenizer/token.ts';
import type { TokenIf } from '~/tokenizer/types.ts';

async function* asyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

Deno.test('applyVisitor', async (t) => {
  await t.step('applies visitor method for matching token type', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any) {
        return tk.setType('MODIFIED_WORD');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'hello');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'MODIFIED_WORD');
  });

  await t.step('returns token unchanged when no matching visitor method', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any) {
        return tk.setType('MODIFIED');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('NUMBER', '42');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'NUMBER');
    assertEquals(result.value, '42');
  });

  await t.step('calls defaultMethod when token type not in visitor', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async defaultMethod(tk: any) {
        return tk.setType('DEFAULT_HANDLED');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('UNKNOWN', 'test');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'DEFAULT_HANDLED');
  });

  await t.step('specific method takes precedence over defaultMethod', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any) {
        return tk.setType('SPECIFIC');
      },
      // deno-lint-ignore no-explicit-any
      async defaultMethod(tk: any) {
        return tk.setType('DEFAULT');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'hello');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'SPECIFIC');
  });

  await t.step('visitor can modify token value', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any) {
        return tk.setValue('modified');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'original');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.value, 'modified');
  });

  await t.step('visitor receives iterable for lookahead', async () => {
    // deno-lint-ignore no-explicit-any
    let receivedIterable: any = null;

    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any, iterable: any) {
        receivedIterable = iterable;
        return tk;
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'hello');
    const iterable = asyncIterable([token]);

    await apply(token, 0, iterable);
    assertEquals(receivedIterable !== null, true);
  });

  await t.step('empty visitor returns token unchanged', async () => {
    const visitor = {};

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'hello');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'WORD');
    assertEquals(result.value, 'hello');
  });

  await t.step('async visitor methods work correctly', async () => {
    const visitor = {
      // deno-lint-ignore no-explicit-any
      async WORD(tk: any) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return tk.setType('ASYNC_MODIFIED');
      },
    };

    const apply = applyVisitor(visitor);
    const token = mkToken('WORD', 'hello');
    const iterable = asyncIterable([token]);

    const result = (await apply(token, 0, iterable)) as TokenIf;
    assertEquals(result.type, 'ASYNC_MODIFIED');
  });
});
