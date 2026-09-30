const hasSpace = /\s/;
const hasSeparator = /(_|-|\.|:)/;
const hasCamel = /([a-z][A-Z]|[A-Z][a-z])/;

const separatorSplitter = /[\W_]+(.|$)/g;
const camelSplitter = /(.)([A-Z]+)/g;

const unseparate = (str: string) => {
  return str.replace(separatorSplitter, (_, next) => {
    return next ? ' ' + next : '';
  });
};

const uncamelize = (str: string) => {
  return str.replace(camelSplitter, (_, previous, uppers) => {
    return previous + ' ' + uppers.toLowerCase().split('').join(' ');
  });
};

const toNoCase = (str: string) => {
  if (hasSpace.test(str)) return str.toLowerCase();
  if (hasSeparator.test(str)) return (unseparate(str) || str).toLowerCase();
  if (hasCamel.test(str)) return uncamelize(str).toLowerCase();
  return str.toLowerCase();
};

const toSpaceCase = (str: string) => {
  return toNoCase(str).replace(/[\W_]+(.|$)/g, (_, match) => {
    return match ? ' ' + match : '';
  }).trim();
};

/** The few token types there are, each converted once: this ran for every token */
const pascalCases = new Map<string, string>();

const toPascalCase = (str: string): string => {
  let result = pascalCases.get(str);

  if (result === undefined) {
    result = toSpaceCase(str).replace(/(?:^|\s)(\w)/g, (_, letter) => {
      return letter.toUpperCase();
    });

    if (pascalCases.size < 1000) pascalCases.set(str, result);
  }

  return result;
};

export default toPascalCase;
export { toPascalCase };
