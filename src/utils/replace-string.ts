type Chunk = {
  text: string;
  start: number;
  end: number;
  isReplacement?: boolean;
};

export type ProtectedRange = {
  start: number;
  end: number;
};

export class ReplaceString {
  private chunks: Chunk[] = [];

  constructor(text: string) {
    this.chunks = [
      {
        text,
        start: 0,
        end: text.length,
      },
    ];
  }

  replace(start: number, end: number, text: string) {
    if (start < 0 || end < 0) {
      return;
    }

    const index = this.chunks.findIndex((chunk) => chunk.start <= start && chunk.end >= end);

    if (index === -1) {
      throw new Error(`Invalid range (${start}-${end}): ${text}`);
    }

    const current = this.chunks[index];

    const prefix: Chunk = {
      text: current.text.slice(0, start - current.start),
      start: current.start,
      end: start,
    };

    const replacement: Chunk = {
      text,
      start,
      end,
      isReplacement: true,
    };

    const suffix: Chunk = {
      text: current.text.slice(end - current.start),
      start: end,
      end: current.end,
    };

    this.chunks.splice(index, 1, prefix, replacement, suffix);
  }

  get text(): string {
    return this.chunks.map(({ text }) => text).join('');
  }

  get protectedRanges(): ProtectedRange[] {
    const ranges: ProtectedRange[] = [];
    let pos = 0;

    for (const chunk of this.chunks) {
      const len = chunk.text.length;
      if (chunk.isReplacement && len > 0) {
        ranges.push({ start: pos, end: pos + len });
      }
      pos += len;
    }

    return ranges;
  }
}
