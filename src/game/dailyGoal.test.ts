import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import { chestReward, chestSeed, dailyGoalStatus, normalizeDailyGoal } from "./dailyGoal";

describe("dailyGoalStatus", () => {
  it.each([
    // before, gained, goal → xpToday, justReached, reached
    [0, 10, 20, 10, false, false],
    [10, 10, 20, 20, true, true],
    [15, 10, 20, 25, true, true],
    [20, 10, 20, 30, false, true],
    [0, 0, 10, 0, false, false],
    [0, 50, 50, 50, true, true],
    [49, 0, 50, 49, false, false],
    [0, 5, 0, 5, true, true], // degenerate goal treated as 1
  ])("before=%d +%d goal=%d → %d", (before, gained, goal, xpToday, justReached, reached) => {
    expect(dailyGoalStatus(before, gained, goal)).toMatchObject({ xpToday, justReached, reached });
  });

  it("reports progress capped at 1", () => {
    expect(dailyGoalStatus(5, 5, 20).progress).toBe(0.5);
    expect(dailyGoalStatus(30, 30, 20).progress).toBe(1);
  });
});

describe("chestReward", () => {
  it("is deterministic and in range", () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 500; seed++) {
      const gems = chestReward(seed);
      expect(gems).toBe(chestReward(seed));
      expect(gems).toBeGreaterThanOrEqual(GAME.gems.chestMin);
      expect(gems).toBeLessThanOrEqual(GAME.gems.chestMax);
      expect(Number.isInteger(gems)).toBe(true);
      seen.add(gems);
    }
    // covers the whole range, both ends included
    expect(seen.size).toBe(GAME.gems.chestMax - GAME.gems.chestMin + 1);
  });

  it("accepts string seeds and derives them per user and day", () => {
    expect(chestReward("abc")).toBe(chestReward("abc"));
    expect(chestSeed("u1", "2026-10-26")).toBe(chestSeed("u1", "2026-10-26"));
    expect(chestSeed("u1", "2026-10-26")).not.toBe(chestSeed("u1", "2026-10-27"));
    expect(chestSeed("u1", "2026-10-26")).not.toBe(chestSeed("u2", "2026-10-26"));
  });
});

describe("normalizeDailyGoal", () => {
  it("keeps valid options and falls back otherwise", () => {
    for (const g of GAME.dailyGoalOptions) expect(normalizeDailyGoal(g)).toBe(g);
    expect(normalizeDailyGoal(13)).toBe(GAME.dailyGoalDefault);
  });
});
