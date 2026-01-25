const operators = {
  '&': 'AND',
  '|': 'PIPE',
  '((': 'DOUBLE_OPEN_PAREN',
  '))': 'DOUBLE_CLOSE_PAREN',
  '(': 'OPEN_PAREN',
  ')': 'CLOSE_PAREN',
  '>': 'GREAT',
  '<': 'LESS',
  '&&': 'AND_IF',
  '||': 'OR_IF',
  ';;': 'DSEMI',
  '<<': 'DLESS',
  '>>': 'DGREAT',
  '<&': 'LESSAND',
  '>&': 'GREATAND',
  '<>': 'LESSGREAT',
  '<<-': 'DLESSDASH',
  '>|': 'CLOBBER',
  ';': 'SEMICOLON',
};

export default operators;
