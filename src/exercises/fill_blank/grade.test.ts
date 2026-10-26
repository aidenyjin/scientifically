import { describe, expect, it } from "vitest";
import { markBlanks } from "./grade";
import { fillBlank } from "./index";
import { isForgivableTypo, levenshtein } from "./typos";

const [gases, symbols, newton] = fillBlank.examples;

describe("fill_blank", () => {
  it("examples are valid", () => {
    expect(fillBlank.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of fillBlank.examples) {
      expect(fillBlank.schema.safeParse(example).success).toBe(true);
      expect(fillBlank.autoCheck?.(example)).toEqual([]);
    }
  });

  it("accepts any listed answer, ignoring case and extra spaces", () => {
    expect(fillBlank.grade(gases, { values: ["  Carbon   Dioxide ", "OXYGEN"] }).correct).toBe(true);
    expect(fillBlank.grade(gases, { values: ["carbon dioxide", "oxygen gas"] }).correct).toBe(true);
    expect(fillBlank.grade(gases, { values: ["oxygen", "carbon dioxide"] }).correct).toBe(false);
  });

  it("matches markup answers by their plain text (CO_{2} → CO2)", () => {
    expect(fillBlank.grade(gases, { values: ["co2", "O2"] }).correct).toBe(true);
  });

  it("respects caseSensitive blanks", () => {
    expect(fillBlank.grade(symbols, { values: ["Na", "K"] }).correct).toBe(true);
    expect(fillBlank.grade(symbols, { values: ["NA", "K"] }).correct).toBe(false);
    expect(fillBlank.grade(symbols, { values: ["na", "k"] }).correct).toBe(false);
  });

  it("forgives a one-letter typo on long answers with a spelling note", () => {
    expect(fillBlank.grade(newton, { values: ["accelaration"] })).toEqual({
      correct: true,
      correctAnswerText: "Newton's second law says the resultant force on an object equals its mass multiplied by its **acceleration**.",
      feedback: "Watch the spelling: acceleration",
    });
    expect(fillBlank.grade(newton, { values: ["acelaration"] }).correct).toBe(false);
    expect(markBlanks(gases, ["carbon dioxide", "oxygn"])).toEqual([
      { correct: true },
      { correct: true, typoOf: "oxygen" },
    ]);
  });

  it("never forgives typos on short or case-sensitive answers", () => {
    const short = { ...newton, blanks: [{ accepted: ["iron"] }] };
    expect(fillBlank.grade(short, { values: ["irn"] }).correct).toBe(false);
    const cs = { ...newton, blanks: [{ accepted: ["Chlorine"], caseSensitive: true }] };
    expect(fillBlank.grade(cs, { values: ["Chlorne"] }).correct).toBe(false);
  });

  it("does not treat a different science term as a typo", () => {
    expect(isForgivableTypo("alkene", "alkane")).toBe(false);
    expect(isForgivableTypo("sulfite", "sulfate")).toBe(false);
    expect(isForgivableTypo("chloride", "chlorine")).toBe(false);
    expect(isForgivableTypo("photon", "proton")).toBe(false);
    expect(isForgivableTypo("neuron", "neutron")).toBe(false);
    expect(isForgivableTypo("sulfte", "sulfate")).toBe(true);
    expect(isForgivableTypo("neutrons", "neutron")).toBe(true);
  });

  it("builds the filled sentence as the correct answer", () => {
    expect(fillBlank.grade(symbols, { values: ["x", "y"] }).correctAnswerText).toBe(
      "The symbol for sodium is **Na** and the symbol for potassium is **K**.",
    );
  });

  it("treats empty or missing values as wrong without crashing", () => {
    expect(fillBlank.grade(gases, { values: ["carbon dioxide"] }).correct).toBe(false);
    expect(fillBlank.grade(gases, { values: ["", ""] }).correct).toBe(false);
    const bad = {} as unknown as { values: string[] };
    expect(fillBlank.grade(gases, bad).correct).toBe(false);
  });

  it("autoCheck flags empty and duplicate accepted answers", () => {
    expect(fillBlank.autoCheck?.({ ...newton, blanks: [{ accepted: ["  "] }] })).toEqual([
      "blank 1 has an empty accepted answer",
    ]);
    expect(fillBlank.autoCheck?.({ ...newton, blanks: [{ accepted: ["Force", "force "] }] })).toEqual([
      "blank 1 has duplicate accepted answers",
    ]);
    expect(
      fillBlank.autoCheck?.({ ...newton, blanks: [{ accepted: ["Co", "CO"], caseSensitive: true }] }),
    ).toEqual([]);
  });

  it("schema requires one blank per ___", () => {
    expect(fillBlank.schema.safeParse({ ...newton, blanks: [] }).success).toBe(false);
    expect(fillBlank.schema.safeParse({ ...newton, text: "No blanks here." }).success).toBe(false);
  });

  it("computes edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("same", "same")).toBe(0);
  });
});
