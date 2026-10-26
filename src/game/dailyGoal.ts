import { hashString, randInt, rng } from "@/lib/rng";
import { GAME } from "./config";

export interface DailyGoalStatus {
  xpToday: number;
  /** This XP gain crossed the goal (show the celebration + chest once). */
  justReached: boolean;
  reached: boolean;
  /** 0–1, for the goal ring. */
  progress: number;
}

/** `xpBefore` = XP already earned today (local date), `xpGained` = this lesson's XP. */
export function dailyGoalStatus(xpBefore: number, xpGained: number, goal: number): DailyGoalStatus {
  const target = Math.max(1, goal);
  const before = Math.max(0, xpBefore);
  const xpToday = before + Math.max(0, xpGained);
  const reached = xpToday >= target;
  return {
    xpToday,
    justReached: reached && before < target,
    reached,
    progress: Math.min(1, xpToday / target),
  };
}

/** Deterministic chest seed for a user's daily-goal chest on a local date. */
export function chestSeed(userId: string, date: string): number {
  return hashString(`chest:${userId}:${date}`);
}

/** Gems in a daily-goal chest, in [chestMin, chestMax]. Same seed → same reward. */
export function chestReward(seed: number | string): number {
  const n = typeof seed === "string" ? hashString(seed) : seed;
  return randInt(rng(n), GAME.gems.chestMin, GAME.gems.chestMax);
}

/** Clamp a stored goal to one of the offered options (falls back to the default). */
export function normalizeDailyGoal(goal: number): number {
  return (GAME.dailyGoalOptions as readonly number[]).includes(goal) ? goal : GAME.dailyGoalDefault;
}
