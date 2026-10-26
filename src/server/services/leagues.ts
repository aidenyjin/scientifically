import "server-only";
import {
  GAME,
  groupIdFor,
  leagueTable,
  resolveWeek,
  shiftWeek,
  tierName,
  timeLeft,
  weekBounds,
  weekIdFor,
  weekOutcome,
  zoneSizes,
} from "@/game";
import { db } from "@/server/db";

/** Weekly XP for a set of users. */
async function weeklyXp(userIds: string[], weekId: string): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const { start, end } = weekBounds(weekId);
  const rows = await db.xpEvent.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, at: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
}

async function groupTable(weekId: string, groupId: string, tier: number, at: Date) {
  const memberships = await db.leagueMembership.findMany({
    where: { weekId, groupId },
    include: { user: { select: { id: true, name: true } } },
  });
  const xp = await weeklyXp(
    memberships.map((m) => m.userId),
    weekId,
  );
  return leagueTable(
    {
      weekId,
      groupId,
      tier,
      members: memberships.map((m) => ({ id: m.userId, name: m.user.name, xp: xp.get(m.userId) ?? 0 })),
    },
    at,
  );
}

/**
 * Make sure the user is in this week's league. Closes out their previous
 * league week first (rank → promoted / demoted / stayed) to pick the tier.
 */
export async function ensureMembership(userId: string, now: Date) {
  const weekId = weekIdFor(now);
  const existing = await db.leagueMembership.findUnique({ where: { userId_weekId: { userId, weekId } } });
  if (existing) return existing;

  const last = await db.leagueMembership.findFirst({
    where: { userId, weekId: { lt: weekId } },
    orderBy: { weekId: "desc" },
  });
  let tier = 0;
  if (last) {
    let finalRank = last.finalRank;
    if (last.outcome === null || finalRank === null) {
      const end = new Date(weekBounds(last.weekId).end.getTime() - 1);
      const table = await groupTable(last.weekId, last.groupId, last.tier, end);
      finalRank = table.find((r) => r.id === userId)?.rank ?? table.length;
      await db.leagueMembership.update({
        where: { id: last.id },
        data: { finalRank, outcome: weekOutcome(finalRank, table.length, last.tier) },
      });
    }
    tier = resolveWeek(finalRank, GAME.leagues.groupSize, last.tier);
    // Sitting out whole weeks drops one tier (never below the first).
    if (last.weekId !== shiftWeek(weekId, -1)) tier = Math.max(0, tier - 1);
  }
  return db.leagueMembership.upsert({
    where: { userId_weekId: { userId, weekId } },
    update: {},
    create: { userId, weekId, tier, groupId: groupIdFor(weekId, tier, userId) },
  });
}

export async function getLeagueView(userId: string, now: Date) {
  const m = await ensureMembership(userId, now);
  const rows = await groupTable(m.weekId, m.groupId, m.tier, now);
  const me = rows.find((r) => r.id === userId);
  return {
    weekId: m.weekId,
    tier: m.tier,
    tierName: tierName(m.tier),
    timeLeftMs: timeLeft(now),
    zones: zoneSizes(rows.length),
    myRank: me?.rank ?? rows.length,
    myXp: me?.xp ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      xp: r.xp,
      rank: r.rank,
      zone: r.zone,
      isBot: r.isBot,
      isMe: r.id === userId,
      color: "color" in r && r.color ? r.color : "#6c5ce7",
    })),
  };
}

export type LeagueView = Awaited<ReturnType<typeof getLeagueView>>;
