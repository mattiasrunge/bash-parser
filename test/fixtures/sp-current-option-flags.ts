export default {
  sourceCode: 'echoword=$-',
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        prefix: [
          {
            text: 'echoword=$-',
            expansion: [
              {
                loc: {
                  start: 9,
                  end: 10,
                },
                parameter: '-',
                type: 'ParameterExpansion',
                kind: 'current-option-flags',
              },
            ],
            type: 'AssignmentWord',
          },
        ],
      },
    ],
  },
};
