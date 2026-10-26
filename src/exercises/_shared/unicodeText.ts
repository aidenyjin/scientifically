import { parseRichText, type RichNode } from "@/content/richtext";

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "−": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "−": "₋", "=": "₌", "(": "₍", ")": "₎",
};

function mapAll(text: string, table: Record<string, string>, fallback: string): string {
  const chars = [...text];
  if (chars.every((c) => table[c])) return chars.map((c) => table[c]).join("");
  return fallback;
}

/**
 * Content markup → plain Unicode text, for places that can't render HTML
 * (SVG <text>, chart axes): `m/s^{2}` → "m/s²", `H_{2}O` → "H₂O". Bold and
 * italic markers are dropped. Unmappable scripts fall back to `^(...)`/`_(...)`.
 */
export function toUnicodeText(input: string): string {
  const walk = (nodes: RichNode[]): string =>
    nodes
      .map((n) => {
        switch (n.kind) {
          case "text":
            return n.text;
          case "bold":
          case "italic":
            return walk(n.children);
          case "sup":
            return mapAll(n.text, SUP, `^(${n.text})`);
          case "sub":
            return mapAll(n.text, SUB, `_(${n.text})`);
        }
      })
      .join("");
  return walk(parseRichText(input));
}
