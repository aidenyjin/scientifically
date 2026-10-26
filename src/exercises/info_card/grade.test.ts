import { describe, expect, it } from "vitest";
import { infoCard } from "./index";

describe("info_card", () => {
  it("examples are valid and always correct", () => {
    for (const ex of infoCard.examples) {
      expect(infoCard.schema.safeParse(ex).success).toBe(true);
      expect(infoCard.grade(ex, {}).correct).toBe(true);
    }
    expect(infoCard.graded).toBe(false);
  });
});
