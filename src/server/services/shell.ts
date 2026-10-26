import "server-only";
import { now } from "@/lib/clock";
import { getActivePack, listPacks } from "@/server/repo/packs";
import { requireUser } from "@/server/repo/users";
import { getLeagueView } from "./leagues";
import { syncPlayer, xpToday } from "./player";
import { getQuestsToday } from "./quests";

/** Data for the always-visible stats in the app shell. Also syncs hearts/streak to now. */
export async function getShellData() {
  const user = await requireUser();
  const t = now();
  const [pack, packs, player, xp, league, quests] = await Promise.all([
    getActivePack(user.activePackId),
    listPacks("published"),
    syncPlayer(user, t),
    xpToday(user, t),
    getLeagueView(user.id, t),
    getQuestsToday(user, t),
  ]);

  return {
    user,
    player,
    pack: pack ? { id: pack.id, title: pack.title, subject: pack.subject } : null,
    packs: packs.map((p) => ({ id: p.id, title: p.title, subject: p.subject, level: p.level })),
    streak: player.streak.current,
    streakActiveToday: player.streak.activeToday,
    gems: player.wallet.gems,
    hearts: player.hearts,
    nextHeartAt: player.nextHeartAt,
    freezes: player.wallet.streakFreezes,
    xpToday: xp,
    league: { tier: league.tier, tierName: league.tierName, rank: league.myRank, xp: league.myXp, promote: league.zones.promote },
    quests,
    dailyGoal: user.dailyGoalXp,
  };
}

export type ShellData = Awaited<ReturnType<typeof getShellData>>;
