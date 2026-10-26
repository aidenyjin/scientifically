import { describe, expect, it } from "vitest";
import type { Exercise } from "@/content/registry";
import { infoCard } from "@/exercises/info_card";
import { multipleChoice } from "@/exercises/multiple_choice";
import { trueFalse } from "@/exercises/true_false";
import {
  advance,
  check,
  createLesson,
  currentExercise,
  lessonStats,
  progress,
  refillHearts,
  setResponse,
  type LessonState,
} from "./lesson";

const info = infoCard.examples[0] as Exercise;
const mc = multipleChoice.examples[0] as Exercise & { type: "multiple_choice" };
const tf = trueFalse.examples[0] as Exercise & { type: "true_false" };

function answer(state: LessonState, right: boolean): LessonState {
  const ex = currentExercise(state)!;
  if (ex.type === "multiple_choice") {
    return check(setResponse(state, { index: right ? ex.answerIndex : (ex.answerIndex + 1) % ex.options.length }));
  }
  if (ex.type === "true_false") return check(setResponse(state, { value: right ? ex.answer : !ex.answer }));
  return check(setResponse(state, {}));
}

describe("lesson engine", () => {
  it("completes when every exercise is answered", () => {
    let s = createLesson([info, mc, tf], { mode: "standard", hearts: 5 });
    s = advance(answer(s, true)); // info card
    s = advance(answer(s, true));
    expect(progress(s)).toBeCloseTo(2 / 3);
    s = advance(answer(s, true));
    expect(s.status).toBe("complete");
    expect(progress(s)).toBe(1);
    const stats = lessonStats(s);
    expect(stats).toMatchObject({ total: 2, firstTryCorrect: 2, perfect: true, accuracy: 1 });
  });

  it("does not check without a response", () => {
    const s = createLesson([mc], { mode: "standard", hearts: 5 });
    expect(check(s)).toBe(s);
  });

  it("info cards never cost hearts", () => {
    let s = createLesson([info, mc], { mode: "standard", hearts: 5 });
    s = check(setResponse(s, {}));
    expect(s.status).toBe("correct");
    expect(s.hearts).toBe(5);
  });

  it("re-queues a wrong answer once at the end and costs a heart", () => {
    let s = createLesson([mc, tf], { mode: "standard", hearts: 5 });
    s = answer(s, false);
    expect(s.status).toBe("incorrect");
    expect(s.hearts).toBe(4);
    expect(s.queue).toHaveLength(3);
    s = advance(s);
    s = advance(answer(s, true)); // tf
    expect(currentExercise(s)?.id).toBe(mc.id);
    s = answer(s, false); // retry wrong again: no further re-queue
    expect(s.queue).toHaveLength(3);
    s = advance(s);
    expect(s.status).toBe("complete");
    expect(lessonStats(s)).toMatchObject({ firstTryCorrect: 1, perfect: false, heartsLost: 2, mistakeIds: [mc.id] });
  });

  it("fails after the feedback when hearts run out", () => {
    let s = createLesson([mc, tf], { mode: "standard", hearts: 1 });
    s = answer(s, false);
    expect(s.hearts).toBe(0);
    expect(s.outOfHearts).toBe(true);
    expect(s.status).toBe("incorrect");
    s = advance(s);
    expect(s.status).toBe("failed");
  });

  it("can resume after a heart refill", () => {
    let s = createLesson([mc, tf], { mode: "standard", hearts: 1 });
    s = advance(answer(s, false));
    s = refillHearts(s, 5);
    expect(s.status).toBe("answering");
    expect(s.hearts).toBe(5);
    expect(currentExercise(s)?.id).toBe(tf.id);
  });

  it("practice lessons have unlimited hearts", () => {
    let s = createLesson([mc], { mode: "practice", hearts: 2 });
    s = answer(s, false);
    expect(s.hearts).toBeNull();
    expect(s.heartsLost).toBe(0);
  });

  it("skip counts as wrong", () => {
    let s = createLesson([mc, tf], { mode: "standard", hearts: 5 });
    s = check(s, { skip: true });
    expect(s.status).toBe("incorrect");
    expect(s.hearts).toBe(4);
  });

  it("tracks combos", () => {
    let s = createLesson([mc, tf, { ...mc, id: "mc-2" }], { mode: "standard", hearts: 5 });
    s = advance(answer(s, true));
    s = advance(answer(s, true));
    expect(s.combo).toBe(2);
    s = answer(s, false);
    expect(s.combo).toBe(0);
    expect(s.bestCombo).toBe(2);
  });
});
