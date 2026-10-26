import { hashString, rng } from "@/lib/rng";
import { GAME } from "./config";

/**
 * Spaced repetition per skillTag (SM-2-lite). Mirrors the SkillStrength table.
 *
 * - Correct: interval grows ×growth (first success → firstIntervalDays) and
 *   strength rises. Reviewing before the due date only earns part of that, so
 *   answering the same skill five times in one lesson doesn't jump weeks ahead.
 * - Wrong: interval resets to wrongIntervalDays and strength drops.
 * - After the due date, effective strength decays (half-life ≈ the interval).
 */
export interface SkillState {
  /** 0–1 */
  strength: number;
  intervalDays: number;
  lastSeenAt: Date;
  dueAt: Date;
}

const DAY_MS = 86_400_000;

export function updateSkill(skill: SkillState | null, correct: boolean, now: Date): SkillState {
  const cfg = GAME.srs;
  const strength = clamp01(skill?.strength ?? 0);
  const interval = Math.max(0, skill?.intervalDays ?? 0);
  if (!correct) {
    return schedule(strength * cfg.wrongFactor, cfg.wrongIntervalDays, now);
  }
  if (!skill || interval <= 0) {
    return schedule(strength + (1 - strength) * cfg.correctGain, cfg.firstIntervalDays, now);
  }
  // 0 = reviewed again straight away, 1 = reviewed on (or after) the due date.
  const elapsedDays = Math.max(0, now.getTime() - skill.lastSeenAt.getTime()) / DAY_MS;
  const readiness = Math.min(1, elapsedDays / interval);
  const nextInterval = Math.min(cfg.maxIntervalDays, interval * (1 + (cfg.growth - 1) * readiness));
  const gain = cfg.correctGain * (0.25 + 0.75 * readiness);
  return schedule(strength + (1 - strength) * gain, Math.max(interval, nextInterval), now);
}

/** Strength now: the stored strength until due, then decaying. */
export function effectiveStrength(skill: SkillState, now: Date): number {
  const overdueDays = (now.getTime() - skill.dueAt.getTime()) / DAY_MS;
  const strength = clamp01(skill.strength);
  if (overdueDays <= 0) return strength;
  const halfLife = Math.max(GAME.srs.minHalfLifeDays, skill.intervalDays);
  return strength * Math.pow(0.5, overdueDays / halfLife);
}

export function isDue(skill: SkillState, now: Date): boolean {
  return now.getTime() >= skill.dueAt.getTime();
}

/** Apply a lesson's per-exercise outcomes; returns only the tags that changed. */
export function updateSkillsForOutcomes(
  skills: Readonly<Record<string, SkillState>>,
  outcomes: readonly { skillTags: readonly string[]; correctFirstTry: boolean }[],
  now: Date,
): Record<string, SkillState> {
  const changed: Record<string, SkillState> = {};
  for (const o of outcomes) {
    for (const tag of new Set(o.skillTags)) {
      changed[tag] = updateSkill(changed[tag] ?? skills[tag] ?? null, o.correctFirstTry, now);
    }
  }
  return changed;
}

export interface SkillSummary {
  tag: string;
  strength: number;
  due: boolean;
  dueAt: Date;
}

/** Skills weakest first (due before not due at equal strength), for the Practice page. */
export function rankSkills(
  skills: Readonly<Record<string, SkillState>>,
  now: Date,
): SkillSummary[] {
  return Object.entries(skills)
    .map(([tag, s]) => ({
      tag,
      strength: effectiveStrength(s, now),
      due: isDue(s, now),
      dueAt: s.dueAt,
    }))
    .sort(
      (a, b) =>
        a.strength - b.strength || Number(b.due) - Number(a.due) || a.tag.localeCompare(b.tag),
    );
}

export interface PracticeCandidate {
  exerciseId: string;
  skillTags: readonly string[];
  /** Most recent wrong answer to this exercise, if any. */
  lastWrongAt?: Date | null;
}

/**
 * Exercise ids for a practice lesson: due and weak skills first, then recent
 * mistakes, spreading picks across skills. No duplicates; deterministic for a
 * given seed.
 */
export function pickPractice(
  candidates: readonly PracticeCandidate[],
  skills: Readonly<Record<string, SkillState>>,
  now: Date,
  size: number = GAME.practice.size,
  seed = 0,
): string[] {
  const pool = dedupeCandidates(candidates);
  const windowMs = GAME.srs.mistakeWindowDays * DAY_MS;

  const need = new Map<string, number>();
  const tagNeed = (tag: string) => {
    const cached = need.get(tag);
    if (cached !== undefined) return cached;
    const s = skills[tag];
    // Unseen skills sit in the middle: weaker than mastered ones, not as urgent as due ones.
    const value = s ? (isDue(s, now) ? 1 : 0) + (1 - effectiveStrength(s, now)) : 0.75;
    need.set(tag, value);
    return value;
  };

  const scored = pool.map((c) => {
    const ageMs = c.lastWrongAt ? now.getTime() - c.lastWrongAt.getTime() : Infinity;
    const mistake = ageMs >= 0 && ageMs < windowMs ? 0.5 * (1 - ageMs / windowMs) + 0.1 : 0;
    const jitter = rng(hashString(`${seed}:${c.exerciseId}`))() * 0.05;
    return { ...c, mistake, jitter };
  });

  const picked: string[] = [];
  const uses = new Map<string, number>();
  const count = Math.max(0, Math.floor(size));
  while (picked.length < count && scored.length > 0) {
    let best = -1;
    let bestScore = -Infinity;
    scored.forEach((c, i) => {
      // Each pick of a skill halves its pull, so one weak skill doesn't fill the whole lesson.
      const skillScore = c.skillTags.length
        ? Math.max(...c.skillTags.map((t) => tagNeed(t) * Math.pow(0.5, uses.get(t) ?? 0)))
        : 0;
      const score = skillScore + c.mistake + c.jitter;
      if (score > bestScore || (score === bestScore && c.exerciseId < scored[best].exerciseId)) {
        best = i;
        bestScore = score;
      }
    });
    const [chosen] = scored.splice(best, 1);
    picked.push(chosen.exerciseId);
    for (const t of new Set(chosen.skillTags)) uses.set(t, (uses.get(t) ?? 0) + 1);
  }
  return picked;
}

export interface AttemptLike {
  exerciseId: string;
  correct: boolean;
  at: Date;
}

/**
 * Most recent wrong exercises, newest first, deduped. By default an exercise
 * answered correctly after its last mistake counts as fixed and is left out.
 */
export function mistakesReview(
  attempts: readonly AttemptLike[],
  size: number = GAME.practice.size,
  { includeFixed = false }: { includeFixed?: boolean } = {},
): string[] {
  const lastWrong = new Map<string, number>();
  const lastRight = new Map<string, number>();
  const order = new Map<string, number>();
  attempts.forEach((a, i) => {
    const t = a.at.getTime();
    const map = a.correct ? lastRight : lastWrong;
    if (t >= (map.get(a.exerciseId) ?? -Infinity)) map.set(a.exerciseId, t);
    if (!a.correct && !order.has(a.exerciseId)) order.set(a.exerciseId, i);
  });
  return [...lastWrong.entries()]
    .filter(([id, t]) => includeFixed || (lastRight.get(id) ?? -Infinity) <= t)
    .sort((a, b) => b[1] - a[1] || (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
    .slice(0, Math.max(0, Math.floor(size)))
    .map(([id]) => id);
}

function schedule(strength: number, intervalDays: number, now: Date): SkillState {
  return {
    strength: clamp01(strength),
    intervalDays,
    lastSeenAt: now,
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

function dedupeCandidates(candidates: readonly PracticeCandidate[]): PracticeCandidate[] {
  const byId = new Map<string, PracticeCandidate>();
  for (const c of candidates) {
    const prev = byId.get(c.exerciseId);
    if (!prev) {
      byId.set(c.exerciseId, { ...c, skillTags: [...new Set(c.skillTags)] });
      continue;
    }
    const prevWrong = prev.lastWrongAt?.getTime() ?? -Infinity;
    const wrong = c.lastWrongAt?.getTime() ?? -Infinity;
    byId.set(c.exerciseId, {
      exerciseId: c.exerciseId,
      skillTags: [...new Set([...prev.skillTags, ...c.skillTags])],
      lastWrongAt: wrong > prevWrong ? c.lastWrongAt : prev.lastWrongAt,
    });
  }
  return [...byId.values()];
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
