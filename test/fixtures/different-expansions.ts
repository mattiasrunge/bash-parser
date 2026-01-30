export default {
  sourceCode: 'variable=$((42 + 43)) $ciao',
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        name: {
          text: '$ciao',
          expansion: [
            {
              loc: {
                start: 0,
                end: 4,
              },
              parameter: 'ciao',
              type: 'ParameterExpansion',
            },
          ],
          type: 'Word',
        },
        prefix: [
          {
            text: 'variable=$((42 + 43))',
            expansion: [
              {
                loc: {
                  start: 9,
                  end: 20,
                },
                type: 'ArithmeticExpansion',
                expression: '42 + 43',
                arithmeticAST: {
                  type: 'BinaryExpression',
                  loc: {
                    start: {
                      char: 12,
                    },
                    end: {
                      char: 19,
                    },
                  },
                  left: {
                    type: 'NumericLiteral',
                    loc: {
                      start: {
                        char: 12,
                      },
                      end: {
                        char: 14,
                      },
                    },
                    extra: {
                      rawValue: 42,
                      raw: '42',
                    },
                    value: 42,
                  },
                  operator: '+',
                  right: {
                    type: 'NumericLiteral',
                    loc: {
                      start: {
                        char: 17,
                      },
                      end: {
                        char: 19,
                      },
                    },
                    extra: {
                      rawValue: 43,
                      raw: '43',
                    },
                    value: 43,
                  },
                },
              },
            ],
            type: 'AssignmentWord',
          },
        ],
      },
    ],
  },
};
