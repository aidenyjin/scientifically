import "server-only";
import {
  isDoubleXpActive,
  nextHeartAt,
  regenHearts,
  settleStreak,
  streakStatus,
  xpOnDate,
  levelForXp,
  type StreakState,
  type Wallet as GameWallet,
} from "@/game";
import { localDateString } from "@/lib/clock";
import { db } from "@/server/db";
import type { CurrentUser } from "@/server/repo/users";

/** DB row → game streak state. */
export function toStreakState(row: CurrentUser["streak"]): StreakState {
  return {
    current: row?.current ?? 0,
    longest: row?.longest ?? 0,
    lastActiveDate: row?.lastActiveDate ?? null,
    frozenDates: parseJson<string[]>(row?.frozenDates, []),
  };
}

export function toGameWallet(row: NonNullable<CurrentUser["wallet"]>, hearts = row.hearts): GameWallet {
  const boosts = parseJson<{ doubleXpUntil?: string | null }>(row.boosts, {});
  return {
    gems: row.gems,
    hearts,
    streakFreezes: row.streakFreezes,
    cosmetics: parseJson<string[]>(row.cosmetics, []),
    doubleXpUntil: boosts.doubleXpUntil ?? null,
  };
}

export function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Bring time-based state up to `now` and persist it: regenerate hearts, and
 * settle the streak for days that have fully passed (consuming freezes or
 * losing the streak). Safe to call on every request.
 */
export async function syncPlayer(user: CurrentUser, now: Date) {
  const wallet = user.wallet!;
  const today = localDateString(now, user.timezone);

  const hearts = regenHearts({ hearts: wallet.hearts, updatedAt: wallet.heartsUpdatedAt }, now);
  const heartsChanged =
    hearts.hearts !== wallet.hearts || hearts.updatedAt.getTime() !== wallet.heartsUpdatedAt.getTime();

  const streakBefore = toStreakState(user.streak);
  const settled = settleStreak(streakBefore, today, wallet.streakFreezes);
  const streakChanged = settled.freezesUsed > 0 || settled.lost;
  const freezes = wallet.streakFreezes - settled.freezesUsed;

  if (heartsChanged || streakChanged) {
    await db.$transaction([
      db.wallet.update({
        where: { userId: user.id },
        data: { hearts: hearts.hearts, heartsUpdatedAt: hearts.updatedAt, streakFreezes: freezes },
      }),
      ...(streakChanged
        ? [
            db.streak.update({
              where: { userId: user.id },
              data: { current: settled.state.current, frozenDates: JSON.stringify(settled.state.frozenDates) },
            }),
          ]
        : []),
    ]);
  }

  const gameWallet = toGameWallet({ ...wallet, streakFreezes: freezes }, hearts.hearts);
  return {
    today,
    hearts: hearts.hearts,
    heartsUpdatedAt: hearts.updatedAt,
    nextHeartAt: nextHeartAt(hearts, now),
    wallet: gameWallet,
    doubleXp: isDoubleXpActive(gameWallet, now),
    streakState: settled.state,
    streak: streakStatus(settled.state, today, freezes),
    streakLostNow: settled.lost,
  };
}

export type PlayerState = Awaited<ReturnType<typeof syncPlayer>>;

/** XP earned on the user's local `today`. */
export async function xpToday(user: CurrentUser, now: Date): Promise<number> {
  const events = await db.xpEvent.findMany({
    where: { userId: user.id, at: { gte: new Date(now.getTime() - 50 * 3_600_000) } },
    select: { amount: true, at: true },
  });
  return xpOnDate(events, localDateString(now, user.timezone), user.timezone);
}

export async function totalXp(userId: string): Promise<number> {
  const agg = await db.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } });
  return agg._sum.amount ?? 0;
}

export async function levelInfo(userId: string) {
  return levelForXp(await totalXp(userId));
}
