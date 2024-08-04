import type { Options } from '~/types.ts';

export const fieldSplittingMark = (result: string, text: string, options: Options) => {
  if (
    typeof options.resolveEnv === 'function' &&
    text[0] !== "'" && text[0] !== '"'
  ) {
    const ifs = options.resolveEnv('IFS');

    if (ifs !== null) {
      return result.replace(new RegExp(`[${ifs}]+`, 'g'), '\0');
    }
  }

  return result;
};

export default fieldSplittingMark;
