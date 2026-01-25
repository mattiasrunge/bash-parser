import { assertEquals } from '@std/assert';
import operatorTokens from '~/modes/bash/phases/operator-tokens.ts';
import { mkToken } from '~/tokenizer/token.ts';
import operators from '~/modes/bash/enums/operators.ts';
import toArray from '~/utils/iterable/to-array.ts';

async function* asyncIterable<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

Deno.test('operator-tokens phase', async (t) => {
  const ctx = {
    enums: {
      operators,
    },
  } as any;

  const phase = operatorTokens(ctx);

  await t.step('converts & operator to AND', async () => {
    const tokens = [mkToken('OPERATOR', '&')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'AND');
  });

  await t.step('converts | operator to PIPE', async () => {
    const tokens = [mkToken('OPERATOR', '|')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'PIPE');
  });

  await t.step('converts (( operator to DOUBLE_OPEN_PAREN', async () => {
    const tokens = [mkToken('OPERATOR', '((')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DOUBLE_OPEN_PAREN');
  });

  await t.step('converts )) operator to DOUBLE_CLOSE_PAREN', async () => {
    const tokens = [mkToken('OPERATOR', '))')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DOUBLE_CLOSE_PAREN');
  });

  await t.step('converts ( operator to OPEN_PAREN', async () => {
    const tokens = [mkToken('OPERATOR', '(')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'OPEN_PAREN');
  });

  await t.step('converts ) operator to CLOSE_PAREN', async () => {
    const tokens = [mkToken('OPERATOR', ')')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'CLOSE_PAREN');
  });

  await t.step('converts > operator to GREAT', async () => {
    const tokens = [mkToken('OPERATOR', '>')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'GREAT');
  });

  await t.step('converts < operator to LESS', async () => {
    const tokens = [mkToken('OPERATOR', '<')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'LESS');
  });

  await t.step('converts && operator to AND_IF', async () => {
    const tokens = [mkToken('OPERATOR', '&&')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'AND_IF');
  });

  await t.step('converts || operator to OR_IF', async () => {
    const tokens = [mkToken('OPERATOR', '||')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'OR_IF');
  });

  await t.step('converts ;; operator to DSEMI', async () => {
    const tokens = [mkToken('OPERATOR', ';;')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DSEMI');
  });

  await t.step('converts << operator to DLESS', async () => {
    const tokens = [mkToken('OPERATOR', '<<')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DLESS');
  });

  await t.step('converts >> operator to DGREAT', async () => {
    const tokens = [mkToken('OPERATOR', '>>')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DGREAT');
  });

  await t.step('converts <& operator to LESSAND', async () => {
    const tokens = [mkToken('OPERATOR', '<&')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'LESSAND');
  });

  await t.step('converts >& operator to GREATAND', async () => {
    const tokens = [mkToken('OPERATOR', '>&')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'GREATAND');
  });

  await t.step('converts <> operator to LESSGREAT', async () => {
    const tokens = [mkToken('OPERATOR', '<>')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'LESSGREAT');
  });

  await t.step('converts <<- operator to DLESSDASH', async () => {
    const tokens = [mkToken('OPERATOR', '<<-')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'DLESSDASH');
  });

  await t.step('converts >| operator to CLOBBER', async () => {
    const tokens = [mkToken('OPERATOR', '>|')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'CLOBBER');
  });

  await t.step('converts ; operator to SEMICOLON', async () => {
    const tokens = [mkToken('OPERATOR', ';')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'SEMICOLON');
  });

  await t.step('leaves non-OPERATOR tokens unchanged', async () => {
    const tokens = [mkToken('WORD', 'hello')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'WORD');
    assertEquals(result[0].value, 'hello');
  });

  await t.step('leaves OPERATOR with unknown value unchanged', async () => {
    const tokens = [mkToken('OPERATOR', 'unknown')];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'OPERATOR');
    assertEquals(result[0].value, 'unknown');
  });

  await t.step('processes multiple tokens', async () => {
    const tokens = [
      mkToken('OPERATOR', '|'),
      mkToken('WORD', 'grep'),
      mkToken('OPERATOR', '>'),
    ];
    const result = await toArray(phase(asyncIterable(tokens)));
    assertEquals(result[0].type, 'PIPE');
    assertEquals(result[1].type, 'WORD');
    assertEquals(result[2].type, 'GREAT');
  });
});
