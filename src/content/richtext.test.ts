import { describe, expect, it } from "vitest";
import { parseRichText, richTextToPlain } from "./richtext";

describe("parseRichText", () => {
  it("parses plain text", () => {
    expect(parseRichText("hello")).toEqual([{ kind: "text", text: "hello" }]);
  });

  it("parses subscripts and superscripts", () => {
    expect(parseRichText("H_{2}O at 9.8 m/s^{2}")).toEqual([
      { kind: "text", text: "H" },
      { kind: "sub", text: "2" },
      { kind: "text", text: "O at 9.8 m/s" },
      { kind: "sup", text: "2" },
    ]);
  });

  it("parses bold and italic with nesting", () => {
    expect(parseRichText("**CO_{2}** is *a gas*")).toEqual([
      { kind: "bold", children: [{ kind: "text", text: "CO" }, { kind: "sub", text: "2" }] },
      { kind: "text", text: " is " },
      { kind: "italic", children: [{ kind: "text", text: "a gas" }] },
    ]);
  });

  it("leaves unclosed markers as text", () => {
    expect(richTextToPlain("2 * 3 = 6 and x_{")).toBe("2 * 3 = 6 and x_{");
    expect(richTextToPlain("**open")).toBe("**open");
  });

  it("strips markup to plain text", () => {
    expect(richTextToPlain("**Fe**_{2}O_{3}")).toBe("Fe2O3");
  });
});
