import toPascalCase from '../src/utils/to-pascal-case.ts';
import utils from './_utils.ts';

const cases: { [key: string]: string } = {
  camel: 'thisIsAString',
  constant: 'THIS_IS_A_STRING',
  dot: 'this.is.a.string',
  pascal: 'ThisIsAString',
  sentence: 'This is a string.',
  snake: 'this_is_a_string',
  space: 'this is a string',
  title: 'This Is a String',
  junk: '-this__is$%a-string...',
};

Deno.test('to-pascal-case', async (t) => {
  for (const key in cases) {
    await t.step(`should convert ${key} case`, () => {
      utils.checkResults(toPascalCase(cases[key]), 'ThisIsAString');
    });
  }
});
