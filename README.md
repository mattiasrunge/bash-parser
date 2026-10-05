# bash-parser

Parses bash source code to produce an AST.

## Table of Contents

- [About This Fork](#about-this-fork)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Bash conformance](#bash-conformance)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About This Fork

This project is a fork of the original [bash-parser](https://github.com/vorpaljs/bash-parser) project, which appears to be unmaintained.

### Objectives

- Parse what bash parses, the way bash parses it
- Minimize dependencies where feasible
- Migrate the codebase to TypeScript
- Ensure compatibility with [Deno](https://deno.com/) instead of [Node.js](https://nodejs.org/)
- Update the API to support asynchronous resolvers
- Distribute releases via [JSR](https://jsr.io/)

### Non-Objectives

- No guarantee of compatibility with the original project
- Maintain only a `bash` parser to simplify the project, without separate `posix` and `bash` parsers

## Features

- Parses bash 5.2 syntax: compound commands, functions, `case` with `;&` and `;;&`, `select`, `[[ ]]`, `(( ))`, `for (( ;; ))`,
  `time`, `coproc`, arrays and associative arrays, here-documents and here-strings, process substitution, `{fd}` redirections
- Words keep their expansions: parameter expansion with every operator and `@` transform, command substitution (`$( )` and
  backticks), arithmetic expansion (`$(( ))` and `$[ ]`), brace expansion, `$'…'` ANSI-C quoting and extended glob patterns
- Arithmetic expressions parsed into their own AST (`parseArithmetic`)
- Aliases expanded where bash expands them, through a resolver
- Syntax errors as bash reports them: the unexpected token, an unexpected end of file, or the quote that never closed
- Supports asynchronous resolvers

## Installation

```bash
deno add jsr:@ein/bash-parser
```

## Usage

```ts
import { parse } from '@ein/bash-parser';

const ast = await parse('echo ciao');
```

`ast` result is:

```js
{
  type: "Script",
  commands: [
    {
      type: "Command",
      name: { text: "echo", type: "Word" },
      suffix: [{ text: "ciao", type: "Word" }]
    }
  ]
}
```

### Options

`parse(source, options)` takes an options object. All of it is optional; the full descriptions are in
[`types.ts`](./src/types.ts).

| Option                      | What it does                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `insertLOC`                 | Add line, column and offset information to every node                                                         |
| `resolveAlias`              | Expand aliases where a command name stands; returns the alias's text, or `undefined`                          |
| `deferTildeExpansion`       | Leave `~` prefixes as `TildeExpansion` nodes for the caller to expand when it runs the word                   |
| `unterminatedHereDocuments` | `'error'` (default) refuses input ending inside a here-document; `'end'` takes the rest as its body           |
| `substitution`              | The text is the body of a `$( … )`, as bash reads one                                                         |
| `posix`                     | Read as bash does after `set -o posix`                                                                        |
| `resolve*`, `execCommand`   | Resolve expansions while parsing, for a caller that wants words expanded rather than kept as they are written |

A shell runs the AST itself and expands words as it runs them, so it passes `resolveAlias`, `deferTildeExpansion` and
none of the other resolvers.

### Syntax errors

A syntax error throws a `BashSyntaxError`. Its `location` is where the error is, and its `detail` says what bash would:

```ts
import { BashSyntaxError, parse } from '@ein/bash-parser';

try {
  await parse('if true; then');
} catch (e) {
  if (e instanceof BashSyntaxError) {
    e.detail; // { kind: 'eof' }  — 'token', 'eof', 'unclosed' or 'arithmeticFor'
    e.getFormattedMessage();
  }
}
```

## Bash conformance

The parser is tested against GNU bash 5.2's own test suite, together with
[bash-executor](https://github.com/mattiasrunge/bash-executor), which runs what it parses. Its
[conformance report](https://github.com/mattiasrunge/bash-executor/blob/master/conformance/REPORT.md) is the current state,
and [the conformance README](https://github.com/mattiasrunge/bash-executor/blob/master/conformance/README.md) explains how
it is measured.

462 of the suite's 471 test files parse. The other nine hold deliberate syntax errors, which bash reports and then
continues past, or one of the constructs below. Two commands that bash accepts are still rejected:

- An alias whose value starts a comment that continues past the alias: `alias long_comment='# for x in '`.
- A here-document started inside `$( … )` whose body follows the `)`: `echo $(cat << EOF)`, then the body lines.

Unlike bash, the parser takes a whole script at once, so a syntax error anywhere in it rejects all of it. bash reads
and runs one command at a time, and runs the commands before the error. A shell that needs bash's behaviour parses
one complete command at a time, as bash-executor does.

## Documentation

### AST

The AST types are described in [`types.ts`](./src/ast/types.ts). Each node corresponds to a language construct: a
`Script` holds commands, a `Command` has a `name`, a `prefix` of assignments and redirections and a `suffix` of words and
redirections, and a `Word` keeps its `text` and the `expansion`s inside it, with where each one starts and ends.

### How the parser works

1. **Tokenizer** ([`src/tokenizer`](./src/tokenizer), with bash's reducers in [`src/modes/bash/reducers`](./src/modes/bash/reducers)):
   reads the source character by character into tokens: words, operators, newlines, here-document bodies.
2. **Lexer phases** ([`src/modes/bash/phases`](./src/modes/bash/phases)): classify tokens by where they stand (reserved words,
   assignments, names), expand aliases, and find each word's expansions.
3. **Grammar** ([`src/grammar`](./src/grammar)): an LALR parser, generated by `deno task build-parser` from the bash
   grammar, builds the AST from the tokens through the AST builder.

## Contributing

Contributions are welcome! Please see the [`CONTRIBUTING.md`](./CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License. See the [`LICENSE`](./LICENCE) file for more details. Other included code are described in [`CREDITS.md`](./CREDITS.md).

## Contact

For questions or support, please open an issue on the [GitHub repository](https://github.com/mattiasrunge/bash-parser/issues).
