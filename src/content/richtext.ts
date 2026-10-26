/**
 * Tiny markup used in all content text:
 *   **bold**   *italic*   H_{2}O (subscript)   m/s^{2} (superscript)
 * Anything else is plain text. Unclosed markers are left as literal text.
 */
export type RichNode =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: RichNode[] }
  | { kind: "italic"; children: RichNode[] }
  | { kind: "sub"; text: string }
  | { kind: "sup"; text: string };

export function parseRichText(input: string): RichNode[] {
  const nodes: RichNode[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) nodes.push({ kind: "text", text: buffer });
    buffer = "";
  };

  while (i < input.length) {
    const ch = input[i];

    if ((ch === "_" || ch === "^") && input[i + 1] === "{") {
      const close = input.indexOf("}", i + 2);
      if (close !== -1) {
        flush();
        nodes.push({ kind: ch === "_" ? "sub" : "sup", text: input.slice(i + 2, close) });
        i = close + 1;
        continue;
      }
    }

    if (ch === "*" && input[i + 1] === "*") {
      const close = input.indexOf("**", i + 2);
      if (close > i + 2) {
        flush();
        nodes.push({ kind: "bold", children: parseRichText(input.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if (ch === "*" && input[i + 1] !== "*") {
      const close = findSingleStar(input, i + 1);
      if (close > i + 1) {
        flush();
        nodes.push({ kind: "italic", children: parseRichText(input.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    buffer += ch;
    i++;
  }
  flush();
  return nodes;
}

function findSingleStar(input: string, from: number): number {
  for (let j = from; j < input.length; j++) {
    if (input[j] === "*" && input[j + 1] !== "*" && input[j - 1] !== "*") return j;
  }
  return -1;
}

/** Plain-text version (markup stripped), for aria labels and comparisons. */
export function richTextToPlain(input: string): string {
  const walk = (nodes: RichNode[]): string =>
    nodes
      .map((n) => (n.kind === "bold" || n.kind === "italic" ? walk(n.children) : n.text))
      .join("");
  return walk(parseRichText(input));
}
