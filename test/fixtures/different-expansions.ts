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
                  operator: '+',
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
