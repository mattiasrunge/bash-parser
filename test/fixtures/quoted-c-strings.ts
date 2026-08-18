// A backslash inside double quotes is literal in bash: "ec\t\nho" is nine
// characters, not a tab and a newline. Only $'…' decodes escape sequences.
export default {
  sourceCode: '"ec\\t\\nho"',
  result: {
    type: 'Script',
    commands: [
      {
        type: 'Command',
        name: {
          text: 'ec\\t\\nho',
          type: 'Word',
        },
      },
    ],
  },
};
