import "server-only";
import type { CompletionSummary, LessonCompletionInput } from "@/engine/summary";
import { GAME } from "@/game/config";
import { db } from "@/server/db";

/**
 * MINIMAL VERSION — records progress, attempts and base XP. The game-systems
 * wiring milestone replaces the body with the full rules from src/game
 * (streaks, hearts, daily goal, quests, achievements, SRS, leagues) while
 * keeping this signature.
 */
export async function completeLessonForUser(
  userId: string,
  input: LessonCompletionInput,
): Promise<CompletionSummary> {
  const { stats } = input;
  const base = input.mode === "checkpoint" ? GAME.xp.checkpoint : input.mode === "practice" ? GAME.xp.practice : GAME.xp.lesson;
  const breakdown = [{ label: "Lesson", amount: base }];
  if (stats.perfect && input.mode !== "practice") breakdown.push({ label: "Perfect", amount: GAME.xp.perfectBonus });
  const xp = breakdown.reduce((a, b) => a + b.amount, 0);

  const existing = await db.lessonProgress.findUnique({
    where: { userId_packId_lessonId: { userId, packId: input.packId, lessonId: input.lessonId } },
  });
  const [, , wallet] = await db.$transaction([
    db.lessonProgress.upsert({
      where: { userId_packId_lessonId: { userId, packId: input.packId, lessonId: input.lessonId } },
      update: { timesCompleted: { increment: 1 }, bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, stats.accuracy), completedAt: new Date() },
      create: { userId, packId: input.packId, lessonId: input.lessonId, bestAccuracy: stats.accuracy },
    }),
    db.xpEvent.create({ data: { userId, amount: xp, source: input.mode === "standard" ? "lesson" : input.mode } }),
    db.wallet.update({
      where: { userId },
      data: { gems: { increment: GAME.gems.perLesson }, hearts: { decrement: stats.heartsLost } },
    }),
    ...stats.outcomes.map((o) =>
      db.attempt.create({
        data: {
          userId,
          packId: input.packId,
          lessonId: input.lessonId,
          exerciseId: o.exerciseId,
          skillTags: JSON.stringify(o.skillTags),
          correct: o.correctFirstTry,
        },
      }),
    ),
  ]);

  return {
    xp: { total: xp, breakdown },
    gemsEarned: GAME.gems.perLesson,
    gemsBalance: wallet.gems,
    hearts: Math.max(0, wallet.hearts),
    streak: { current: 1, extended: false, freezeUsed: false },
    dailyGoal: { xpToday: xp, goal: 20, justReached: false, chestGems: 0 },
    quests: [],
    achievements: [],
  };
}

export async function loseHearts(userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) return;
  await db.wallet.update({ where: { userId }, data: { hearts: Math.max(0, wallet.hearts - count) } });
}

export async function refillHeartsWithGems(userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) return { ok: false, hearts: 0, gems: 0, error: "No wallet" };
  if (wallet.gems < GAME.hearts.refillCost) return { ok: false, hearts: wallet.hearts, gems: wallet.gems, error: "Not enough gems" };
  const updated = await db.wallet.update({
    where: { userId },
    data: { gems: { decrement: GAME.hearts.refillCost }, hearts: GAME.hearts.max, heartsUpdatedAt: new Date() },
  });
  return { ok: true, hearts: updated.hearts, gems: updated.gems };
}
