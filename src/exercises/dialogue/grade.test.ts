import { describe, expect, it } from "vitest";
import { dialogue } from "./index";
import { expressionForLine, layoutLines } from "./layout";
import type { Dialogue } from "./schema";

const [osmosis, circuit] = dialogue.examples;

describe("dialogue", () => {
  it("examples are valid and pass autoCheck", () => {
    expect(dialogue.examples.length).toBeGreaterThanOrEqual(2);
    for (const ex of dialogue.examples) {
      expect(dialogue.schema.safeParse(ex).success, ex.id).toBe(true);
      expect(dialogue.autoCheck?.(ex), ex.id).toEqual([]);
    }
  });

  it("grades like multiple choice", () => {
    expect(dialogue.grade(circuit, { index: 1 })).toEqual({
      correct: true,
      correctAnswerText: "It goes out — the loop is broken",
    });
    expect(dialogue.grade(circuit, { index: 0 })).toEqual({
      correct: false,
      correctAnswerText: "It goes out — the loop is broken",
    });
    expect(dialogue.grade(osmosis, {} as never)).toMatchObject({ correct: false });
  });

  it("schema rejects an answerIndex outside the options and unknown characters", () => {
    expect(
      dialogue.schema.safeParse({ ...osmosis, question: { ...osmosis.question, answerIndex: 4 } })
        .success,
    ).toBe(false);
    expect(
      dialogue.schema.safeParse({ ...osmosis, lines: [{ characterId: "zed", text: "Hi" }] })
        .success,
    ).toBe(false);
  });

  it("autoCheck flags duplicate options and give-away lines", () => {
    const dup: Dialogue = {
      ...osmosis,
      question: { options: ["Osmosis", " osmosis "], answerIndex: 0 },
    };
    expect(dialogue.autoCheck?.(dup)).toEqual(["question.options contain duplicates"]);
    const leaky: Dialogue = {
      ...osmosis,
      lines: [
        ...osmosis.lines,
        { characterId: "lumi", text: "Easy: water, moving in by osmosis." },
      ],
    };
    expect(dialogue.autoCheck?.(leaky)).toEqual([
      "a line gives away the correct option word for word",
    ]);
    const shortAnswer: Dialogue = {
      ...osmosis,
      question: { options: ["Water", "Salt"], answerIndex: 0 },
    };
    expect(dialogue.autoCheck?.(shortAnswer)).toEqual([]);
  });

  it("puts speakers on alternating sides and groups runs", () => {
    const lines: Dialogue["lines"] = [
      { characterId: "pip", text: "a" },
      { characterId: "lumi", text: "b" },
      { characterId: "lumi", text: "c" },
      { characterId: "pip", text: "d" },
      { characterId: "nova", text: "e" },
    ];
    expect(layoutLines(lines)).toEqual([
      { side: "left", startsRun: true },
      { side: "right", startsRun: true },
      { side: "right", startsRun: false },
      { side: "left", startsRun: true },
      { side: "right", startsRun: true },
    ]);
  });

  it("picks expressions from punctuation, then from the result", () => {
    expect(expressionForLine("So what's rushing in?!", "answering")).toBe("surprised");
    expect(expressionForLine("What is it?", "answering")).toBe("thinking");
    expect(expressionForLine("A classic circuit!", "answering")).toBe("happy");
    expect(expressionForLine("Earth is round.", "answering")).toBe("neutral");
    expect(expressionForLine("What is it?", "correct")).toBe("happy");
    expect(expressionForLine("What is it?", "incorrect")).toBe("sad");
  });
});
