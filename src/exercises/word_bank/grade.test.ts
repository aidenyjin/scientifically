import { describe, expect, it } from "vitest";
import { markSlots } from "./grade";
import { wordBank } from "./index";

const [cycle, ions] = wordBank.examples;

describe("word_bank", () => {
  it("examples are valid", () => {
    expect(wordBank.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of wordBank.examples) {
      expect(wordBank.schema.safeParse(example).success).toBe(true);
      expect(wordBank.autoCheck?.(example)).toEqual([]);
    }
  });

  it("is correct only when tiles match the answers in order", () => {
    expect(wordBank.grade(cycle, { tiles: ["evaporates", "condenses", "precipitation"] }).correct).toBe(true);
    expect(wordBank.grade(cycle, { tiles: ["condenses", "evaporates", "precipitation"] }).correct).toBe(false);
    expect(wordBank.grade(cycle, { tiles: ["evaporates", "condenses"] }).correct).toBe(false);
    expect(wordBank.grade(cycle, { tiles: ["evaporates", "condenses", "precipitation", "melts"] }).correct).toBe(
      false,
    );
  });

  it("is case-sensitive about tile text (tiles come from the bank)", () => {
    expect(wordBank.grade(ions, { tiles: ["Cations", "anions"] }).correct).toBe(false);
  });

  it("marks each slot", () => {
    expect(markSlots(cycle, ["evaporates", "freezes", "precipitation"])).toEqual([true, false, true]);
    expect(markSlots(cycle, [])).toEqual([false, false, false]);
  });

  it("gives the filled sentence as the correct answer", () => {
    expect(wordBank.grade(ions, { tiles: [] }).correctAnswerText).toBe(
      "Positive ions such as Na^{+} are called **cations**, and negative ions such as Cl^{−} are called **anions**.",
    );
  });

  it("does not crash on a malformed response", () => {
    const bad = {} as unknown as { tiles: string[] };
    expect(wordBank.grade(cycle, bad).correct).toBe(false);
  });

  it("schema caps the bank at 9 tiles and matches blanks to answers", () => {
    const nine = { ...ions, text: "___ ___ ___", answers: ["a", "b", "c"], distractors: ["d", "e", "f", "g", "h", "i"] };
    expect(wordBank.schema.safeParse(nine).success).toBe(true);
    const ten = { ...nine, text: "___ ___ ___ ___", answers: ["a", "b", "c", "j"] };
    expect(wordBank.schema.safeParse(ten).success).toBe(false);
    expect(wordBank.schema.safeParse({ ...ions, answers: ["cations"] }).success).toBe(false);
  });

  it("autoCheck flags distractors that duplicate answers", () => {
    expect(wordBank.autoCheck?.({ ...ions, distractors: ["Cations ", "isotopes"] })).toEqual([
      "distractors duplicate answers: Cations ",
    ]);
    expect(wordBank.autoCheck?.({ ...ions, distractors: ["isotopes", "isotopes"] })).toEqual([
      "distractors contain duplicates",
    ]);
  });
});
