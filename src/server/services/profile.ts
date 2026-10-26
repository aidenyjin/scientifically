import "server-only";
import { activeDatesFrom, calendar, levelForXp, tierName } from "@/game";
import { localDateString } from "@/lib/clock";
import { db } from "@/server/db";
import { parseSettings, type CurrentUser } from "@/server/repo/users";
import { getAchievementsView } from "./achievements";
import { parseJson, syncPlayer, totalXp } from "./player";

export async function getProfile(user: CurrentUser, now: Date) {
  const player = await syncPlayer(user, now);
  const today = localDateString(now, user.timezone);
  const [xp, runs, perfect, achievements, membership, timeAgg] = await Promise.all([
    totalXp(user.id),
    db.lessonRun.findMany({
      where: { userId: user.id, at: { gte: new Date(now.getTime() - 62 * 86_400_000) } },
      select: { at: true },
    }),
    db.lessonRun.count({ where: { userId: user.id, perfect: true } }),
    getAchievementsView(user.id, player.streakState.longest),
    db.leagueMembership.findFirst({ where: { userId: user.id }, orderBy: { weekId: "desc" } }),
    db.lessonRun.aggregate({ where: { userId: user.id }, _sum: { durationMs: true }, _count: true }),
  ]);
  const settings = parseSettings(user.settings);
  return {
    name: user.name,
    email: user.email,
    isGuest: !user.email,
    joined: user.createdAt,
    timezone: user.timezone,
    dailyGoalXp: user.dailyGoalXp,
    settings,
    level: levelForXp(xp),
    totalXp: xp,
    streak: player.streak.current,
    longestStreak: player.streakState.longest,
    freezes: player.wallet.streakFreezes,
    lessons: timeAgg._count,
    perfectLessons: perfect,
    minutes: Math.round((timeAgg._sum.durationMs ?? 0) / 60_000),
    league: membership ? tierName(membership.tier) : null,
    calendar: calendar(player.streakState, today, activeDatesFrom(runs.map((r) => r.at), user.timezone), today),
    achievements,
    ownedCosmetics: player.wallet.cosmetics,
    outfit: (settings.outfit.lumi ?? []) as string[],
    wallet: parseJson<string[]>(user.wallet?.cosmetics, []),
  };
}

export type ProfileView = Awaited<ReturnType<typeof getProfile>>;
