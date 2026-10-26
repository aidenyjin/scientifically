import type { LessonMode } from "@/engine/lesson";
import { localDateString } from "@/lib/clock";
import { GAME } from "./config";

export interface XpLine {
  label: string;
  amount: number;
}

export interface XpAward {
  total: number;
  breakdown: XpLine[];
}

export interface LessonXpInput {
  mode: LessonMode;
  perfect: boolean;
  /** Longest run of correct answers in the lesson. */
  bestCombo: number;
  /** A "double XP" boost is active when the lesson ends. */
  doubleXp: boolean;
}

const BASE_LABEL: Record<LessonMode, string> = {
  standard: "Lesson complete",
  checkpoint: "Checkpoint complete",
  practice: "Practice complete",
};

export function baseXp(mode: LessonMode): number {
  if (mode === "checkpoint") return GAME.xp.checkpoint;
  if (mode === "practice") return GAME.xp.practice;
  return GAME.xp.lesson;
}

/** XP for a finished lesson, with one breakdown line per source (for the results screen). */
export function lessonXp({ mode, perfect, bestCombo, doubleXp }: LessonXpInput): XpAward {
  const breakdown: XpLine[] = [{ label: BASE_LABEL[mode], amount: baseXp(mode) }];
  if (perfect && mode !== "practice")
    breakdown.push({ label: "Perfect lesson", amount: GAME.xp.perfectBonus });
  const combo = Math.floor(Math.max(0, bestCombo) / GAME.xp.comboEvery);
  if (combo > 0) breakdown.push({ label: "Combo bonus", amount: combo });
  const subtotal = sum(breakdown);
  if (doubleXp) breakdown.push({ label: "Double XP", amount: subtotal });
  return { total: sum(breakdown), breakdown };
}

export interface LevelInfo {
  /** 1-based. */
  level: number;
  /** XP earned since reaching `level`. */
  xpIntoLevel: number;
  /** XP needed to go from `level` to `level + 1`. */
  xpForNext: number;
  /** xpIntoLevel / xpForNext, 0–1. */
  progress: number;
}

/** XP it costs to go from `level` to `level + 1`. */
export function xpToLevelUp(level: number): number {
  return GAME.xp.levelBase + GAME.xp.levelStep * (Math.max(1, Math.floor(level)) - 1);
}

/** Total XP at which `level` is reached (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level)) - 1;
  return n * GAME.xp.levelBase + (GAME.xp.levelStep * n * (n - 1)) / 2;
}

/** Gentle arithmetic curve: 60 XP to level 2, then each level costs 30 more than the last. */
export function levelForXp(totalXp: number): LevelInfo {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  let floor = 0;
  while (floor + xpToLevelUp(level) <= xp) {
    floor += xpToLevelUp(level);
    level += 1;
  }
  const xpForNext = xpToLevelUp(level);
  const xpIntoLevel = xp - floor;
  return { level, xpIntoLevel, xpForNext, progress: xpIntoLevel / xpForNext };
}

/** Levels gained going from `before` to `after` total XP (0 if none). */
export function levelsGained(before: number, after: number): number {
  return Math.max(0, levelForXp(after).level - levelForXp(before).level);
}

/** Sum of XP events that fall on local date `date` (YYYY-MM-DD) in `timeZone`. */
export function xpOnDate(
  events: readonly { amount: number; at: Date }[],
  date: string,
  timeZone: string,
): number {
  let total = 0;
  for (const e of events) if (localDateString(e.at, timeZone) === date) total += e.amount;
  return total;
}

/** Sum of XP events with start <= at < end (e.g. a league week). */
export function xpBetween(
  events: readonly { amount: number; at: Date }[],
  start: Date,
  end: Date,
): number {
  let total = 0;
  for (const e of events) {
    const t = e.at.getTime();
    if (t >= start.getTime() && t < end.getTime()) total += e.amount;
  }
  return total;
}

function sum(lines: XpLine[]): number {
  return lines.reduce((a, b) => a + b.amount, 0);
}
