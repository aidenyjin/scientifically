import { describe, expect, it } from "vitest";
import { toUnicodeText } from "./unicodeText";

describe("toUnicodeText", () => {
  it("converts superscripts and subscripts", () => {
    expect(toUnicodeText("m/s^{2}")).toBe("m/s²");
    expect(toUnicodeText("H_{2}O")).toBe("H₂O");
    expect(toUnicodeText("10^{-19} C")).toBe("10⁻¹⁹ C");
  });

  it("drops bold and italic markers", () => {
    expect(toUnicodeText("**Speed** (*m/s*)")).toBe("Speed (m/s)");
  });

  it("falls back when a character has no Unicode form", () => {
    expect(toUnicodeText("x^{ab}")).toBe("x^(ab)");
  });
});
