import { afterEach, describe, expect, it } from "vitest";
import { localDateString, now, setNow } from "@/lib/clock";
import {
  advanceQuest,
  applyActivity,
  chestReward,
  chestSeed,
  dailyGoalStatus,
  EMPTY_STREAK,
  GAME,
  isDoubleXpActive,
  lessonXp,
  purchase,
  questsForDay,
  regenHearts,
  settleStreak,
  shopItemById,
  spendHearts,
  streakStatus,
  type StreakState,
  type Wallet,
} from "./index";

afterEach(() => setNow(null));

const TZ = "America/New_York";

/** A tiny in-memory "server" wired the way the completion service will be. */
function makeUser() {
  let wallet: Wallet = {
    gems: GAME.gems.starting,
    hearts: GAME.hearts.max,
    streakFreezes: 0,
    cosmetics: [],
    doubleXpUntil: null,
  };
  let heartsUpdatedAt = now();
  let streak: StreakState = EMPTY_STREAK;
  const xpByDay = new Map<string, number>();

  return {
    get wallet() {
      return wallet;
    },
    get streak() {
      return streak;
    },
    openApp() {
      const settled = settleStreak(streak, localDateString(now(), TZ), wallet.streakFreezes);
      streak = settled.state;
      wallet = { ...wallet, streakFreezes: wallet.streakFreezes - settled.freezesUsed };
      return settled;
    },
    buy(itemId: string) {
      const item = shopItemById(itemId);
      if (!item) throw new Error(itemId);
      const regen = regenHearts({ hearts: wallet.hearts, updatedAt: heartsUpdatedAt }, now());
      const r = purchase(item, { ...wallet, hearts: regen.hearts }, now());
      if (r.ok) wallet = r.wallet;
      return r;
    },
    completeLesson(heartsLost = 0, perfect = true) {
      const today = localDateString(now(), TZ);
      const xp = lessonXp({
        mode: "standard",
        perfect,
        bestCombo: 5,
        doubleXp: isDoubleXpActive(wallet, now()),
      });
      const hearts = spendHearts(
        { hearts: wallet.hearts, updatedAt: heartsUpdatedAt },
        heartsLost,
        now(),
      );
      heartsUpdatedAt = hearts.updatedAt;
      const s = applyActivity(streak, today, wallet.streakFreezes);
      streak = s.state;
      const before = xpByDay.get(today) ?? 0;
      xpByDay.set(today, before + xp.total);
      const goal = dailyGoalStatus(before, xp.total, 20);
      const chest = goal.justReached ? chestReward(chestSeed("u1", today)) : 0;
      wallet = {
        ...wallet,
        hearts: hearts.hearts,
        streakFreezes: wallet.streakFreezes - s.freezesUsed,
        gems: wallet.gems + GAME.gems.perLesson + chest,
      };
      return { xp, streak: s, goal, chest };
    },
  };
}

describe("game systems together", () => {
  it("a streak freeze bought in the shop protects a missed day", () => {
    setNow(new Date("2026-10-26T14:00:00Z")); // Mon 10:00 EDT
    const user = makeUser();
    expect(user.completeLesson().streak.extended).toBe(true);

    setNow(new Date("2026-10-27T22:00:00Z")); // Tue 18:00
    user.completeLesson();
    expect(user.streak.current).toBe(2);
    const bought = user.buy("streak-freeze");
    expect(bought.ok).toBe(true);
    expect(user.wallet.streakFreezes).toBe(1);

    // Wednesday is missed entirely. Thursday 08:00: the freeze is consumed on open.
    setNow(new Date("2026-10-29T12:00:00Z"));
    expect(
      streakStatus(user.streak, localDateString(now(), TZ), user.wallet.streakFreezes),
    ).toMatchObject({
      current: 2,
      atRisk: true,
      freezesNeeded: 1,
    });
    expect(user.openApp()).toMatchObject({ freezesUsed: 1, lost: false });
    expect(user.wallet.streakFreezes).toBe(0);

    const r = user.completeLesson();
    expect(r.streak).toMatchObject({ extended: true, freezesUsed: 0, reset: false });
    expect(user.streak).toMatchObject({ current: 3, frozenDates: ["2026-10-28"] });
  });

  it("without a freeze the missed day resets the streak, and buying one afterwards is too late", () => {
    setNow(new Date("2026-10-26T14:00:00Z"));
    const user = makeUser();
    user.completeLesson();
    setNow(new Date("2026-10-28T14:00:00Z")); // Tuesday missed
    expect(user.openApp()).toMatchObject({ lost: true, freezesUsed: 0 });
    expect(user.buy("streak-freeze").ok).toBe(true);
    const r = user.completeLesson();
    expect(r.streak).toMatchObject({ reset: true, freezesUsed: 0 });
    expect(user.streak.current).toBe(1);
    expect(user.wallet.streakFreezes).toBe(1); // still owned, protects the future
  });

  it("the day boundary follows the user's time zone", () => {
    setNow(new Date("2026-10-27T03:30:00Z")); // Mon 23:30 EDT
    const user = makeUser();
    user.completeLesson();
    setNow(new Date("2026-10-27T04:30:00Z")); // Tue 00:30 EDT — one hour later, new local day
    expect(user.completeLesson().streak.extended).toBe(true);
    expect(user.streak.current).toBe(2);
  });

  it("daily goal chest is granted once and double XP doubles lesson XP", () => {
    setNow(new Date("2026-10-26T14:00:00Z"));
    const user = makeUser();
    const first = user.completeLesson(); // 10 + 5 perfect + 1 combo = 16
    expect(first.xp.total).toBe(16);
    expect(first.goal).toMatchObject({ justReached: false, xpToday: 16 });
    const second = user.completeLesson();
    expect(second.goal).toMatchObject({ justReached: true, reached: true });
    expect(second.chest).toBeGreaterThanOrEqual(GAME.gems.chestMin);
    expect(user.completeLesson().goal.justReached).toBe(false);

    expect(user.buy("double-xp").ok).toBe(true);
    setNow(new Date("2026-10-26T14:10:00Z"));
    expect(user.completeLesson().xp.total).toBe(32);
    setNow(new Date("2026-10-26T14:16:00Z"));
    expect(user.completeLesson().xp.total).toBe(16);
  });

  it("hearts lost in a lesson regenerate and can be refilled", () => {
    setNow(new Date("2026-10-26T14:00:00Z"));
    const user = makeUser();
    user.completeLesson(3, false);
    expect(user.wallet.hearts).toBe(2);
    expect(user.buy("heart-refill").ok).toBe(true);
    expect(user.wallet.hearts).toBe(GAME.hearts.max);
    expect(user.buy("heart-refill")).toEqual({ ok: false, reason: "hearts_full" });
  });

  it("quests progress from lesson events", () => {
    const quests = questsForDay("2026-10-26", "u1");
    let progress = quests.map(() => 0);
    const event = { xp: 16, mode: "standard" as const, perfect: true, bestCombo: 6, accuracy: 1 };
    for (let i = 0; i < 4; i++)
      progress = quests.map((q, j) => advanceQuest(q, progress[j], event).progress);
    quests.forEach((q, j) => {
      if (
        q.metric !== "checkpoint" &&
        q.metric !== "practice" &&
        !(q.metric === "combo" && q.target > 6)
      ) {
        expect(progress[j]).toBe(q.target);
      }
    });
  });
});
