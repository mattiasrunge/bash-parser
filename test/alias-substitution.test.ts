import type { AstNodeCommand } from '../src/ast/types.ts';
import bashParser from '../src/parse.ts';
import utils from './_utils.ts';

Deno.test('alias-substitution', async (t) => {
  await t.step('alias with no argument', async () => {
    const result = await bashParser('thisIsAlias world', {
      resolveAlias: async (name) => name === 'thisIsAlias' ? 'test-value' : undefined,
    });
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'test-value' },
        suffix: [{ type: 'Word', text: 'world' }],
      }],
    });
  });

  await t.step('alias with duplicating stream redirection', async () => {
    const result = await bashParser('2>&1 world', {
      resolveAlias: async (name) => name === 'world' ? 'test-value' : undefined,
    });

    utils.checkResults(
      (result.commands[0] as AstNodeCommand).name,
      { type: 'Word', text: 'test-value' },
    );
  });

  await t.step('alias with arguments', async () => {
    const result = await bashParser('thisIsAlias world', {
      resolveAlias: async (name) => name === 'thisIsAlias' ? 'test-value earth' : undefined,
    });
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'test-value' },
        suffix: [
          { type: 'Word', text: 'earth' },
          { type: 'Word', text: 'world' },
        ],
      }],
    });
  });

  await t.step('alias with prefixes', async () => {
    const result = await bashParser('thisIsAlias world', {
      resolveAlias: async (name) => name === 'thisIsAlias' ? 'a=42 test-value' : undefined,
    });
    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        prefix: [{ type: 'AssignmentWord', text: 'a=42' }],
        type: 'Command',
        name: { type: 'Word', text: 'test-value' },
        suffix: [{ type: 'Word', text: 'world' }],
      }],
    });
  });

  await t.step('recursive alias with prefixes', async () => {
    const result = await bashParser('thisIsAlias world', {
      resolveAlias: async (name) => {
        if (name === 'thisIsAlias') {
          return 'a=42 recurse';
        }
        if (name === 'recurse') {
          return 'echo other';
        }
      },
    });
    // utils.logResults(result)

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        prefix: [{ type: 'AssignmentWord', text: 'a=42' }],
        type: 'Command',
        name: { type: 'Word', text: 'echo' },
        suffix: [
          { type: 'Word', text: 'other' },
          { type: 'Word', text: 'world' },
        ],
      }],
    });
  });

  await t.step('guarded against infinite loops', async () => {
    const result = await bashParser('thisIsAlias world', {
      resolveAlias: async (name) => {
        if (name === 'thisIsAlias') {
          return 'alias1';
        }
        if (name === 'alias1') {
          return 'alias2';
        }
        if (name === 'alias2') {
          return 'thisIsAlias ciao';
        }
      },
    });
    // utils.logResults(result)

    utils.checkResults(result, {
      type: 'Script',
      commands: [{
        type: 'Command',
        name: { type: 'Word', text: 'thisIsAlias' },
        suffix: [
          { type: 'Word', text: 'ciao' },
          { type: 'Word', text: 'world' },
        ],
      }],
    });
  });
});
