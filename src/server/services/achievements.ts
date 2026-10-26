import "server-only";
import { achievementProgress, type AchievementTotals } from "@/game";
import { db } from "@/server/db";
import { getPack } from "@/server/repo/packs";
import { totalXp } from "./player";

/** Lifetime totals that achievements are measured against. */
export async function achievementTotals(userId: string, longestStreak: number): Promise<AchievementTotals> {
  const [xp, perfectLessons, lessonsCompleted, leagueWins, spent, progress] = await Promise.all([
    totalXp(userId),
    db.lessonRun.count({ where: { userId, perfect: true } }),
    db.lessonRun.count({ where: { userId } }),
    db.leagueMembership.count({ where: { userId, finalRank: 1 } }),
    db.purchase.aggregate({ where: { userId }, _sum: { cost: true } }),
    db.lessonProgress.findMany({ where: { userId }, select: { packId: true, lessonId: true } }),
  ]);

  // A unit counts once every lesson in it is complete.
  let unitsCompleted = 0;
  const byPack = new Map<string, Set<string>>();
  for (const p of progress) {
    if (!byPack.has(p.packId)) byPack.set(p.packId, new Set());
    byPack.get(p.packId)!.add(p.lessonId);
  }
  for (const [packId, done] of byPack) {
    const pack = await getPack(packId);
    if (!pack) continue;
    unitsCompleted += pack.units.filter((u) => u.lessons.every((l) => done.has(l.id))).length;
  }

  return {
    longestStreak,
    totalXp: xp,
    perfectLessons,
    lessonsCompleted,
    unitsCompleted,
    leagueWins,
    gemsSpent: spent._sum.cost ?? 0,
  };
}

export async function getAchievementsView(userId: string, longestStreak: number) {
  const [totals, unlocked] = await Promise.all([
    achievementTotals(userId, longestStreak),
    db.achievementUnlock.findMany({ where: { userId }, select: { achievementId: true, tier: true } }),
  ]);
  return achievementProgress(
    totals,
    unlocked.map((u) => ({ id: u.achievementId, tier: u.tier })),
  );
}
