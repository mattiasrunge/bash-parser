import { assertEquals } from '@std/assert';
import type { LexerContext, LexerPhase } from '../src/lexer/types.ts';
import enums from '../src/modes/bash/enums/mod.ts';
import rules from '../src/modes/bash/phases/mod.ts';
import { mkToken, type TokenIf } from '../src/tokenizer/mod.ts';
import fromArray from '../src/utils/iterable/from-array.ts';
// const _utils = require('./_utils');

const check = async (rule: LexerPhase, actual: TokenIf[], expected: TokenIf[]) => {
  // _utils.logResults({actual: Array.from(rule({}, mode)(actual)), expected});
  const result = [];
  const it = rule({ enums } as LexerContext)(fromArray(actual));

  for await (const tk of it) {
    result.push(tk);
  }

  assertEquals(
    JSON.stringify(
      result,
    ),
    JSON.stringify(expected),
  );
};

Deno.test('tokenization-rules', async (t) => {
  await t.step('operatorTokens - identify operator with their tokens', async () => {
    await check(rules.operatorTokens, [mkToken('OPERATOR', '<<')], [mkToken('DLESS', '<<')]);
  });

  await t.step('reservedWords - identify reserved words or WORD', async () => {
    await check(
      rules.reservedWords,
      [
        mkToken('TOKEN', 'while'),
        mkToken('TOKEN', 'otherWord'),
      ],
      [
        mkToken('While', 'while'),
        mkToken('WORD', 'otherWord'),
      ],
    );
  });

  await t.step('functionName - replace function name token as NAME', async () => {
    const input = [
      mkToken('WORD', 'test', {
        ctx: { maybeStartOfSimpleCommand: true },
      }),
      mkToken('OPEN_PAREN', '('),
      mkToken('CLOSE_PAREN', ')'),
      mkToken('Lbrace', '{'),
      mkToken('WORD', 'body'),
      mkToken('WORD', 'foo'),
      mkToken('WORD', '--lol'),
      mkToken(';', ';'),
      mkToken('Rbrace', '}'),
    ];
    // _utils.logResults(result);

    await check(rules.functionName, input, [
      mkToken('NAME', 'test', {
        ctx: { maybeStartOfSimpleCommand: true },
      }),
      mkToken('OPEN_PAREN', '('),
      mkToken('CLOSE_PAREN', ')'),
      mkToken('Lbrace', '{'),
      mkToken('WORD', 'body'),
      mkToken('WORD', 'foo'),
      mkToken('WORD', '--lol'),
      mkToken(';', ';'),
      mkToken('Rbrace', '}'),
    ]);
  });
});
