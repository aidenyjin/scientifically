import { Fragment, type ReactNode } from "react";
import { parseRichText, type RichNode } from "@/content/richtext";

function render(nodes: RichNode[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case "text":
        // Keep a number with its unit ("5 Ω", "9.8 m/s") on one line.
        return <Fragment key={i}>{node.text.replace(/(\d) (?=[A-Za-zΩμ°%])/g, "$1\u00a0")}</Fragment>;
      case "bold":
        return (
          <strong key={i} className="font-bold">
            {render(node.children)}
          </strong>
        );
      case "italic":
        return <em key={i}>{render(node.children)}</em>;
      case "sub":
        return <sub key={i}>{node.text}</sub>;
      case "sup":
        return <sup key={i}>{node.text}</sup>;
    }
  });
}

/** Renders content text with the tiny markup from src/content/richtext.ts. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{render(parseRichText(text))}</span>;
}
