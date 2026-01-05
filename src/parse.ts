import { astBuilder } from '~/ast/mod.ts';
import { grammar } from '~/grammar/mod.ts';
import type { Mode, ModePlugin } from '~/modes/types.ts';
import type { Parse } from '~/types.ts';
import { Lexer } from './lexer/mod.ts';
import modeBash from './modes/bash/mod.ts';
import modeWordExpansion from './modes/word-expansion/mod.ts';

const loadPlugin = (name: string): Mode => {
  const modes: Record<string, ModePlugin> = {
    'bash': modeBash,
    'word-expansion': modeWordExpansion,
  };

  const modePlugin = modes[name];

  if (modePlugin.inherits) {
    return modePlugin.init(loadPlugin(modePlugin.inherits));
  }

  return modePlugin.init();
};

export const parse: Parse = async (sourceCode, options?) => {
  try {
    options = options || {};
    options.mode = options.mode || 'bash';

    const mode = loadPlugin(options.mode);
    const parser = new grammar.Parser();
    parser.lexer = new Lexer(mode, options);
    parser.yy = astBuilder(options.insertLOC);

    return parser.parse(sourceCode);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw err;
    }
    throw new Error((err as Error).stack || (err as Error).message);
  }
};

export default parse;
