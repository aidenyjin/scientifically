import "server-only";
import type { Exercise } from "@/content/registry";
import { GAME, mistakesReview, pickPractice, rankSkills, type SkillState } from "@/game";
import { hashString } from "@/lib/rng";
import { db } from "@/server/db";
import { getActivePack } from "@/server/repo/packs";
import type { CurrentUser } from "@/server/repo/users";

export type PracticeKind = "practice" | "mistakes";

/** Minimum exercises for a practice session to be worth starting. */
export const MIN_PRACTICE = 3;

async function practicePool(user: CurrentUser) {
  const pack = await getActivePack(user.activePackId);
  if (!pack) return null;
  const done = new Set(
    (await db.lessonProgress.findMany({ where: { userId: user.id, packId: pack.id }, select: { lessonId: true } })).map(
      (r) => r.lessonId,
    ),
  );
  const exercises = new Map<string, Exercise>();
  for (const unit of pack.units)
    for (const lesson of unit.lessons)
      if (done.has(lesson.id))
        for (const ex of lesson.exercises) if (ex.type !== "info_card") exercises.set(ex.id, ex);
  const attempts = await db.attempt.findMany({
    where: { userId: user.id, packId: pack.id },
    orderBy: { at: "desc" },
    take: 500,
    select: { exerciseId: true, correct: true, at: true },
  });
  const skillRows = await db.skillStrength.findMany({ where: { userId: user.id, packId: pack.id } });
  const skills: Record<string, SkillState> = Object.fromEntries(
    skillRows.map((r) => [r.skillTag, { strength: r.strength, intervalDays: r.intervalDays, lastSeenAt: r.lastSeenAt, dueAt: r.dueAt }]),
  );
  return { pack, exercises, attempts, skills };
}

/** Build a practice session. Returns null when there isn't enough to practise yet. */
export async function buildPractice(user: CurrentUser, kind: PracticeKind, now: Date) {
  const pool = await practicePool(user);
  if (!pool) return null;
  const { pack, exercises, attempts, skills } = pool;
  const lastWrong = new Map<string, Date>();
  for (const a of attempts) if (!a.correct && !lastWrong.has(a.exerciseId)) lastWrong.set(a.exerciseId, a.at);

  const ids =
    kind === "mistakes"
      ? mistakesReview(attempts, GAME.practice.size).filter((id) => exercises.has(id))
      : pickPractice(
          [...exercises.values()].map((e) => ({ exerciseId: e.id, skillTags: e.skillTags, lastWrongAt: lastWrong.get(e.id) ?? null })),
          skills,
          now,
          GAME.practice.size,
          hashString(`${user.id}:${now.toISOString().slice(0, 13)}`),
        );
  const list = ids.map((id) => exercises.get(id)!).filter(Boolean);
  if (list.length < MIN_PRACTICE) return null;
  return { packId: pack.id, exercises: list };
}

/** Summary for the Practice page. */
export async function getPracticeOverview(user: CurrentUser, now: Date) {
  const pool = await practicePool(user);
  if (!pool) return null;
  const { exercises, attempts, skills } = pool;
  const mistakes = mistakesReview(attempts, 50).filter((id) => exercises.has(id)).length;
  const ranked = rankSkills(skills, now);
  return {
    available: exercises.size,
    canPractice: exercises.size >= MIN_PRACTICE,
    mistakes,
    canReviewMistakes: mistakes >= MIN_PRACTICE,
    skills: ranked,
  };
}
