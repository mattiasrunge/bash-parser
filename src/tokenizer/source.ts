/**
 * The input left to tokenize: a cursor over its characters. Taking the next one moves the cursor
 * rather than removing it from an array, so a whole script reads in time linear in its length.
 */
export class Source {
  private readonly chars: string[];
  private pos = 0;

  constructor(text: string) {
    this.chars = Array.from(text);
  }

  /** How many characters are left. */
  get length(): number {
    return this.chars.length - this.pos;
  }

  /** Takes the next character; undefined at the end. */
  shift(): string | undefined {
    return this.pos < this.chars.length ? this.chars[this.pos++] : undefined;
  }

  /** Puts back the character taken last, to be read again. Only that one can be put back. */
  unshift(char: string): void {
    if (this.pos === 0 || this.chars[this.pos - 1] !== char) {
      throw new Error(`cannot put back ${JSON.stringify(char)}: it is not the character taken last`);
    }
    this.pos--;
  }

  /** The character `i` places ahead, without taking it: `at(0)` is the next one. */
  at(i: number): string | undefined {
    return this.chars[this.pos + i];
  }

  /** Takes the next `n` characters, or as many as are left. */
  take(n: number): string[] {
    const taken = this.chars.slice(this.pos, this.pos + n);

    this.pos += taken.length;
    return taken;
  }

  /** The next `n` characters as text, or as many as are left, without taking them. */
  peek(n: number): string {
    return this.chars.slice(this.pos, this.pos + n).join('');
  }
}
