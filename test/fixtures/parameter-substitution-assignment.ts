export default {
  sourceCode: 'echoword=${11}test',
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        prefix: [
          {
            text: 'echoword=${11}test',
            expansion: [
              {
                loc: {
                  start: 9,
                  end: 13,
                },
                parameter: 11,
                type: 'ParameterExpansion',
                kind: 'positional',
              },
            ],
            type: 'AssignmentWord',
          },
        ],
      },
    ],
  },
};
