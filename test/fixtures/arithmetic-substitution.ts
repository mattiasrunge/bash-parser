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
                    char: 8,
                  },
                  end: {
                    char: 15,
                  },
                },
                left: {
                  type: 'NumericLiteral',
                  loc: {
                    start: {
                      char: 8,
                    },
                    end: {
                      char: 10,
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
                      char: 13,
                    },
                    end: {
                      char: 15,
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
