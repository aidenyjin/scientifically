import type { LessonMode } from "@/engine/lesson";
import { hashString, rng } from "@/lib/rng";
import { GAME } from "./config";

export type QuestMetric =
  "xp" | "lessons" | "perfectLessons" | "combo" | "checkpoint" | "practice" | "accuracy90";

export interface QuestDef {
  id: string;
  title: string;
  metric: QuestMetric;
  target: number;
  rewardGems: number;
  /** 1 easy · 2 medium · 3 hard. A day gets one of each. */
  difficulty: 1 | 2 | 3;
}

export const QUEST_POOL: readonly QuestDef[] = [
  { id: "xp-20", title: "Earn 20 XP", metric: "xp", target: 20, rewardGems: 10, difficulty: 1 },
  { id: "xp-40", title: "Earn 40 XP", metric: "xp", target: 40, rewardGems: 20, difficulty: 2 },
  { id: "xp-60", title: "Earn 60 XP", metric: "xp", target: 60, rewardGems: 30, difficulty: 3 },
  {
    id: "lessons-2",
    title: "Complete 2 lessons",
    metric: "lessons",
    target: 2,
    rewardGems: 10,
    difficulty: 1,
  },
  {
    id: "lessons-4",
    title: "Complete 4 lessons",
    metric: "lessons",
    target: 4,
    rewardGems: 25,
    difficulty: 3,
  },
  {
    id: "perfect-1",
    title: "Finish a lesson with no mistakes",
    metric: "perfectLessons",
    target: 1,
    rewardGems: 15,
    difficulty: 2,
  },
  {
    id: "perfect-2",
    title: "Finish 2 lessons with no mistakes",
    metric: "perfectLessons",
    target: 2,
    rewardGems: 30,
    difficulty: 3,
  },
  {
    id: "combo-5",
    title: "Get 5 answers in a row right",
    metric: "combo",
    target: 5,
    rewardGems: 10,
    difficulty: 1,
  },
  {
    id: "combo-10",
    title: "Get 10 answers in a row right",
    metric: "combo",
    target: 10,
    rewardGems: 25,
    difficulty: 3,
  },
  {
    id: "checkpoint-1",
    title: "Pass a checkpoint",
    metric: "checkpoint",
    target: 1,
    rewardGems: 25,
    difficulty: 3,
  },
  {
    id: "practice-1",
    title: "Practise your weak skills",
    metric: "practice",
    target: 1,
    rewardGems: 15,
    difficulty: 2,
  },
  {
    id: "accuracy-2",
    title: "Score 90% or more in 2 lessons",
    metric: "accuracy90",
    target: 2,
    rewardGems: 20,
    difficulty: 2,
  },
];

export function questById(id: string): QuestDef | undefined {
  return QUEST_POOL.find((q) => q.id === id);
}

export interface QuestOptions {
  /** Metrics the user can't progress right now (e.g. "practice" before any lesson is done). */
  exclude?: readonly QuestMetric[];
}

/**
 * The user's quests for local date `date`: `GAME.quests.perDay` quests with
 * different metrics, ramping easy → medium → hard. Deterministic per user + day.
 */
export function questsForDay(date: string, userId: string, options: QuestOptions = {}): QuestDef[] {
  const next = rng(hashString(`quests:${userId}:${date}`));
  const excluded = new Set(options.exclude ?? []);
  const available = QUEST_POOL.filter((q) => !excluded.has(q.metric));
  const picked: QuestDef[] = [];
  const usedMetrics = new Set<QuestMetric>();
  for (let slot = 0; slot < GAME.quests.perDay; slot++) {
    const difficulty = Math.min(3, slot + 1);
    const fresh = available.filter((q) => !usedMetrics.has(q.metric) && !picked.includes(q));
    // Prefer the slot's difficulty, then the nearest one, so a day stays varied even with exclusions.
    const pool = [difficulty, difficulty - 1, difficulty + 1, difficulty - 2, difficulty + 2]
      .map((d) => fresh.filter((q) => q.difficulty === d))
      .find((list) => list.length > 0);
    if (!pool) break;
    const quest = pool[Math.floor(next() * pool.length)];
    picked.push(quest);
    usedMetrics.add(quest.metric);
  }
  return picked;
}

/** What a finished lesson reports to quests. */
export interface QuestEvent {
  xp: number;
  mode: LessonMode;
  perfect: boolean;
  bestCombo: number;
  /** 0–1 */
  accuracy: number;
}

/**
 * The event's contribution to `quest`: an increment for most metrics, or the
 * candidate for a new maximum for "combo". Use `advanceQuest` to combine it.
 */
export function questProgress(quest: Pick<QuestDef, "metric">, event: QuestEvent): number {
  switch (quest.metric) {
    case "xp":
      return Math.max(0, event.xp);
    case "lessons":
      return 1;
    case "perfectLessons":
      return event.perfect ? 1 : 0;
    case "combo":
      return Math.max(0, event.bestCombo);
    case "checkpoint":
      return event.mode === "checkpoint" ? 1 : 0;
    case "practice":
      return event.mode === "practice" ? 1 : 0;
    case "accuracy90":
      return event.accuracy >= 0.9 ? 1 : 0;
  }
}

export interface QuestAdvance {
  /** New stored progress, capped at the target. */
  progress: number;
  completed: boolean;
  /** Completed by this event (grant the reward once). */
  justCompleted: boolean;
}

export function advanceQuest(
  quest: Pick<QuestDef, "metric" | "target">,
  progress: number,
  event: QuestEvent,
): QuestAdvance {
  const before = Math.min(Math.max(0, progress), quest.target);
  const delta = questProgress(quest, event);
  const raw = quest.metric === "combo" ? Math.max(before, delta) : before + delta;
  const next = Math.min(raw, quest.target);
  const completed = next >= quest.target;
  return { progress: next, completed, justCompleted: completed && before < quest.target };
}
