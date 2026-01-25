export default {
  sourceCode: '"foo $((42 * 42)) baz"',
  options: {
    runArithmeticExpression: async () => {
      return '43';
    },
  },
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        name: {
          text: 'foo 43 baz',
          expansion: [
            {
              loc: {
                start: 5,
                end: 16,
              },
              type: 'ArithmeticExpansion',
              expression: '42 * 42',
              arithmeticAST: {
                type: 'BinaryExpression',
                loc: {
                  start: {
                    row: 1,
                    col: 0,
                    char: 0,
                  },
                  end: {
                    row: 1,
                    col: 7,
                    char: 7,
                  },
                },
                left: {
                  type: 'NumericLiteral',
                  loc: {
                    start: {
                      row: 1,
                      col: 0,
                      char: 0,
                    },
                    end: {
                      row: 1,
                      col: 2,
                      char: 2,
                    },
                  },
                  extra: {
                    rawValue: 42,
                    raw: '42',
                  },
                  value: 42,
                },
                operator: '*',
                right: {
                  type: 'NumericLiteral',
                  loc: {
                    start: {
                      row: 1,
                      col: 5,
                      char: 5,
                    },
                    end: {
                      row: 1,
                      col: 7,
                      char: 7,
                    },
                  },
                  extra: {
                    rawValue: 42,
                    raw: '42',
                  },
                  value: 42,
                },
              },
              resolved: true,
            },
          ],
          originalText: '"foo $((42 * 42)) baz"',
          type: 'Word',
        },
      },
    ],
  },
};
