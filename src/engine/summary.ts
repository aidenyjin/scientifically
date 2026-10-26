import type { LessonMode, LessonStats } from "./lesson";

/** What the player sends to the server when a lesson ends. */
export interface LessonCompletionInput {
  packId: string;
  lessonId: string;
  mode: LessonMode;
  stats: LessonStats;
  durationMs: number;
}

/** What the server returns after applying XP, streaks, quests, etc. Drives the results screens. */
export interface CompletionSummary {
  xp: { total: number; breakdown: { label: string; amount: number }[] };
  gemsEarned: number;
  gemsBalance: number;
  hearts: number;
  streak: { current: number; extended: boolean; freezeUsed: boolean };
  dailyGoal: { xpToday: number; goal: number; justReached: boolean; chestGems: number };
  quests: { id: string; title: string; progress: number; target: number; justCompleted: boolean }[];
  achievements: { id: string; title: string; tier: number }[];
  /** Lesson that unlocked as a result, if any (for the path animation). */
  unlockedLessonId?: string;
}

export interface RefillResult {
  ok: boolean;
  hearts: number;
  gems: number;
  error?: string;
}
