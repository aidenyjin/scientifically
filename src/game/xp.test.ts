import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import {
  lessonXp,
  levelForXp,
  levelsGained,
  xpBetween,
  xpForLevel,
  xpOnDate,
  xpToLevelUp,
} from "./xp";

describe("lessonXp", () => {
  it.each([
    { mode: "standard", perfect: false, bestCombo: 0, doubleXp: false, total: 10 },
    { mode: "standard", perfect: true, bestCombo: 0, doubleXp: false, total: 15 },
    { mode: "checkpoint", perfect: false, bestCombo: 0, doubleXp: false, total: 20 },
    { mode: "checkpoint", perfect: true, bestCombo: 0, doubleXp: false, total: 25 },
    { mode: "practice", perfect: false, bestCombo: 0, doubleXp: false, total: 5 },
    // no perfect bonus in practice
    { mode: "practice", perfect: true, bestCombo: 0, doubleXp: false, total: 5 },
    // combo: +1 per 5 in a row
    { mode: "standard", perfect: false, bestCombo: 4, doubleXp: false, total: 10 },
    { mode: "standard", perfect: false, bestCombo: 5, doubleXp: false, total: 11 },
    { mode: "standard", perfect: true, bestCombo: 12, doubleXp: false, total: 17 },
    { mode: "practice", perfect: false, bestCombo: 10, doubleXp: false, total: 7 },
    // double XP doubles everything
    { mode: "standard", perfect: true, bestCombo: 10, doubleXp: true, total: 34 },
    { mode: "practice", perfect: false, bestCombo: 0, doubleXp: true, total: 10 },
    { mode: "standard", perfect: false, bestCombo: -3, doubleXp: false, total: 10 },
  ] as const)(
    "$mode perfect=$perfect combo=$bestCombo double=$doubleXp → $total",
    ({ total, ...input }) => {
      const award = lessonXp(input);
      expect(award.total).toBe(total);
      expect(award.breakdown.reduce((a, b) => a + b.amount, 0)).toBe(total);
    },
  );

  it("labels every source in the breakdown", () => {
    expect(
      lessonXp({ mode: "standard", perfect: true, bestCombo: 10, doubleXp: true }).breakdown,
    ).toEqual([
      { label: "Lesson complete", amount: GAME.xp.lesson },
      { label: "Perfect lesson", amount: GAME.xp.perfectBonus },
      { label: "Combo bonus", amount: 2 },
      { label: "Double XP", amount: 17 },
    ]);
    expect(
      lessonXp({ mode: "checkpoint", perfect: false, bestCombo: 0, doubleXp: false }).breakdown,
    ).toEqual([{ label: "Checkpoint complete", amount: GAME.xp.checkpoint }]);
  });
});

describe("levels", () => {
  it("uses a gentle arithmetic curve", () => {
    expect(xpToLevelUp(1)).toBe(60);
    expect(xpToLevelUp(2)).toBe(90);
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(60);
    expect(xpForLevel(3)).toBe(150);
    expect(xpForLevel(10)).toBe(1620);
  });

  it.each([
    [0, 1, 0, 60],
    [59, 1, 59, 60],
    [60, 2, 0, 90],
    [149, 2, 89, 90],
    [150, 3, 0, 120],
    [1620, 10, 0, 330],
    [-50, 1, 0, 60],
    [Number.NaN, 1, 0, 60],
    [75.9, 2, 15, 90],
  ])("%d XP → level %d (%d / %d)", (xp, level, xpIntoLevel, xpForNext) => {
    const info = levelForXp(xp);
    expect(info).toMatchObject({ level, xpIntoLevel, xpForNext });
    expect(info.progress).toBeCloseTo(xpIntoLevel / xpForNext);
  });

  it("is consistent with xpForLevel for many levels", () => {
    for (let level = 1; level < 80; level++) {
      expect(levelForXp(xpForLevel(level)).level).toBe(level);
      expect(levelForXp(xpForLevel(level + 1) - 1).level).toBe(level);
    }
  });

  it("counts levels gained", () => {
    expect(levelsGained(50, 55)).toBe(0);
    expect(levelsGained(55, 65)).toBe(1);
    expect(levelsGained(0, 150)).toBe(2);
    expect(levelsGained(200, 100)).toBe(0);
  });
});

describe("xp sums", () => {
  const events = [
    { amount: 10, at: new Date("2026-03-10T23:30:00Z") },
    { amount: 15, at: new Date("2026-03-11T08:00:00Z") },
    { amount: 20, at: new Date("2026-03-11T16:00:00Z") },
  ];

  it("sums XP on a local date", () => {
    expect(xpOnDate(events, "2026-03-10", "UTC")).toBe(10);
    expect(xpOnDate(events, "2026-03-11", "UTC")).toBe(35);
    // Tokyo is UTC+9: 23:30Z on the 10th is the 11th there; 16:00Z on the 11th is the 12th.
    expect(xpOnDate(events, "2026-03-11", "Asia/Tokyo")).toBe(25);
    expect(xpOnDate(events, "2026-03-12", "Asia/Tokyo")).toBe(20);
    // Los Angeles is UTC-7 (PDT from 8 March): 08:00Z on the 11th is still the 11th (01:00).
    expect(xpOnDate(events, "2026-03-10", "America/Los_Angeles")).toBe(10);
  });

  it("sums XP in a half-open range", () => {
    expect(
      xpBetween(events, new Date("2026-03-11T08:00:00Z"), new Date("2026-03-11T16:00:00Z")),
    ).toBe(15);
  });
});
