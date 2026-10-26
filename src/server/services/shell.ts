import "server-only";
import { localDateString, now } from "@/lib/clock";
import { db } from "@/server/db";
import { getActivePack, listPacks } from "@/server/repo/packs";
import { requireUser } from "@/server/repo/users";

/** Data for the always-visible stats in the app shell. */
export async function getShellData() {
  const user = await requireUser();
  const [pack, packs] = await Promise.all([getActivePack(user.activePackId), listPacks("published")]);
  const today = localDateString(now(), user.timezone);
  const recent = await db.xpEvent.findMany({
    where: { userId: user.id, at: { gte: new Date(now().getTime() - 48 * 3600_000) } },
    select: { amount: true, at: true },
  });
  const xpToday = recent
    .filter((e) => localDateString(e.at, user.timezone) === today)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    user,
    pack: pack ? { id: pack.id, title: pack.title, subject: pack.subject } : null,
    packs: packs.map((p) => ({ id: p.id, title: p.title, subject: p.subject, level: p.level })),
    streak: user.streak?.current ?? 0,
    streakActiveToday: user.streak?.lastActiveDate === today,
    gems: user.wallet?.gems ?? 0,
    hearts: user.wallet?.hearts ?? 0,
    freezes: user.wallet?.streakFreezes ?? 0,
    xpToday,
    dailyGoal: user.dailyGoalXp,
  };
}

export type ShellData = Awaited<ReturnType<typeof getShellData>>;
