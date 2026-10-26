import "server-only";
import {
  applyActivity,
  chestReward,
  chestSeed,
  dailyGoalStatus,
  evaluateAchievements,
  GAME,
  lessonXp,
  purchase,
  PURCHASE_ERROR_MESSAGES,
  restoreHearts,
  shopItemById,
  spendHearts,
  updateSkillsForOutcomes,
  advanceQuest,
  questById,
  type SkillState,
} from "@/game";
import type { CompletionSummary, LessonCompletionInput, RefillResult } from "@/engine/summary";
import { now as clockNow } from "@/lib/clock";
import { db } from "@/server/db";
import { findLesson, flatLessons, getPack } from "@/server/repo/packs";
import type { CurrentUser } from "@/server/repo/users";
import { achievementTotals } from "./achievements";
import { ensureMembership } from "./leagues";
import { syncPlayer, xpToday } from "./player";
import { getQuestsToday } from "./quests";

/** Practice sessions use these pseudo lesson ids. */
export const PRACTICE_LESSON_IDS = ["practice", "mistakes"] as const;

function sanitize(input: LessonCompletionInput): LessonCompletionInput {
  const s = input.stats;
  const total = Math.max(0, Math.min(40, Math.floor(s.total)));
  const firstTryCorrect = Math.max(0, Math.min(total, Math.floor(s.firstTryCorrect)));
  return {
    ...input,
    durationMs: Math.max(0, Math.min(6 * 3_600_000, Math.floor(input.durationMs))),
    stats: {
      ...s,
      total,
      firstTryCorrect,
      accuracy: total === 0 ? 1 : firstTryCorrect / total,
      perfect: total > 0 && firstTryCorrect === total,
      bestCombo: Math.max(0, Math.min(total, Math.floor(s.bestCombo))),
      heartsLost: Math.max(0, Math.min(GAME.hearts.max, Math.floor(s.heartsLost))),
      outcomes: s.outcomes.slice(0, 40),
    },
  };
}

/**
 * Apply every game rule for a finished lesson, in order: streak → hearts →
 * XP → daily goal → quests → progress/attempts/SRS → achievements → league.
 */
export async function completeLessonForUser(
  user: CurrentUser,
  rawInput: LessonCompletionInput,
  now: Date = clockNow(),
): Promise<CompletionSummary> {
  const input = sanitize(rawInput);
  const { stats, mode } = input;
  const isPractice = mode === "practice";

  const pack = await getPack(input.packId);
  if (!pack) throw new Error("Unknown pack");
  if (!isPractice && !findLesson(pack, input.lessonId)) throw new Error("Unknown lesson");

  const player = await syncPlayer(user, now);
  const firstCompletion =
    !isPractice &&
    !(await db.lessonProgress.findUnique({
      where: { userId_packId_lessonId: { userId: user.id, packId: pack.id, lessonId: input.lessonId } },
    }));

  // 1. Streak
  const activity = applyActivity(player.streakState, player.today, player.wallet.streakFreezes);
  const freezes = Math.max(0, player.wallet.streakFreezes - activity.freezesUsed);

  // 2. Hearts
  const heartState = { hearts: player.hearts, updatedAt: player.heartsUpdatedAt };
  const hearts = isPractice
    ? restoreHearts(heartState, GAME.hearts.practiceRestore, now)
    : spendHearts(heartState, stats.heartsLost, now);

  // 3. XP
  const xp = lessonXp({ mode, perfect: stats.perfect, bestCombo: stats.bestCombo, doubleXp: player.doubleXp });

  // 4. Daily goal
  const xpBefore = await xpToday(user, now);
  const goal = dailyGoalStatus(xpBefore, xp.total, user.dailyGoalXp);
  const chestGems = goal.justReached ? chestReward(chestSeed(user.id, player.today)) : 0;

  // 5. Quests (rewards granted automatically on completion)
  const quests = await getQuestsToday(user, now);
  const questEvent = { xp: xp.total, mode, perfect: stats.perfect, bestCombo: stats.bestCombo, accuracy: stats.accuracy };
  const questUpdates = quests.map((q) => {
    const def = questById(q.id)!;
    const adv = advanceQuest(def, q.progress, questEvent);
    return { ...q, ...adv };
  });
  const questGems = questUpdates.filter((q) => q.justCompleted).reduce((sum, q) => sum + q.rewardGems, 0);

  // 6. SRS
  const skillRows = await db.skillStrength.findMany({ where: { userId: user.id, packId: pack.id } });
  const skills: Record<string, SkillState> = Object.fromEntries(
    skillRows.map((r) => [r.skillTag, { strength: r.strength, intervalDays: r.intervalDays, lastSeenAt: r.lastSeenAt, dueAt: r.dueAt }]),
  );
  const changedSkills = updateSkillsForOutcomes(skills, stats.outcomes, now);

  const baseGems = GAME.gems.perLesson;
  const best = !isPractice
    ? await db.lessonProgress.findUnique({
        where: { userId_packId_lessonId: { userId: user.id, packId: pack.id, lessonId: input.lessonId } },
        select: { bestAccuracy: true },
      })
    : null;

  await db.$transaction([
    db.streak.update({
      where: { userId: user.id },
      data: {
        current: activity.state.current,
        longest: activity.state.longest,
        lastActiveDate: activity.state.lastActiveDate,
        frozenDates: JSON.stringify(activity.state.frozenDates),
      },
    }),
    db.xpEvent.create({ data: { userId: user.id, amount: xp.total, source: mode === "standard" ? "lesson" : mode, at: now } }),
    db.lessonRun.create({
      data: {
        userId: user.id,
        packId: pack.id,
        lessonId: input.lessonId,
        mode,
        accuracy: stats.accuracy,
        perfect: stats.perfect,
        xp: xp.total,
        durationMs: input.durationMs,
        at: now,
      },
    }),
    ...(!isPractice
      ? [
          db.lessonProgress.upsert({
            where: { userId_packId_lessonId: { userId: user.id, packId: pack.id, lessonId: input.lessonId } },
            update: {
              timesCompleted: { increment: 1 },
              bestAccuracy: Math.max(best?.bestAccuracy ?? 0, stats.accuracy),
              completedAt: now,
            },
            create: { userId: user.id, packId: pack.id, lessonId: input.lessonId, bestAccuracy: stats.accuracy, completedAt: now },
          }),
        ]
      : []),
    ...stats.outcomes.map((o) =>
      db.attempt.create({
        data: {
          userId: user.id,
          packId: pack.id,
          lessonId: input.lessonId,
          exerciseId: o.exerciseId,
          skillTags: JSON.stringify(o.skillTags),
          correct: o.correctFirstTry,
          at: now,
        },
      }),
    ),
    ...Object.entries(changedSkills).map(([tag, s]) =>
      db.skillStrength.upsert({
        where: { userId_packId_skillTag: { userId: user.id, packId: pack.id, skillTag: tag } },
        update: { strength: s.strength, intervalDays: s.intervalDays, lastSeenAt: s.lastSeenAt, dueAt: s.dueAt },
        create: { userId: user.id, packId: pack.id, skillTag: tag, ...s },
      }),
    ),
    ...questUpdates.map((q) =>
      db.questProgress.update({
        where: { userId_date_questId: { userId: user.id, date: player.today, questId: q.id } },
        data: { progress: q.progress, claimed: q.claimed || q.justCompleted },
      }),
    ),
  ]);

  // 7. Achievements (after the writes above so totals include this lesson)
  const totals = await achievementTotals(user.id, activity.state.longest);
  const unlockedRows = await db.achievementUnlock.findMany({ where: { userId: user.id } });
  const newly = evaluateAchievements(
    totals,
    unlockedRows.map((u) => ({ id: u.achievementId, tier: u.tier })),
  );
  const achievementGems = newly.reduce((sum, a) => sum + a.rewardGems, 0);
  if (newly.length) {
    await db.$transaction(
      newly.map((a) =>
        db.achievementUnlock.create({ data: { userId: user.id, achievementId: a.id, tier: a.tier, unlockedAt: now } }),
      ),
    );
  }

  // 8. Wallet
  const gemsEarned = baseGems + chestGems + questGems + achievementGems;
  const wallet = await db.wallet.update({
    where: { userId: user.id },
    data: {
      gems: player.wallet.gems + gemsEarned,
      hearts: hearts.hearts,
      heartsUpdatedAt: hearts.updatedAt,
      streakFreezes: freezes,
    },
  });

  // 9. League week (XP is read from xp events; this just makes sure they're enrolled)
  await ensureMembership(user.id, now);

  let unlockedLessonId: string | undefined;
  if (firstCompletion) {
    const order = flatLessons(pack);
    const i = order.findIndex((l) => l.lesson.id === input.lessonId);
    unlockedLessonId = order[i + 1]?.lesson.id;
  }

  return {
    xp,
    gemsEarned,
    gemsBalance: wallet.gems,
    hearts: wallet.hearts,
    streak: { current: activity.state.current, extended: activity.extended, freezeUsed: activity.freezesUsed > 0 },
    dailyGoal: { xpToday: goal.xpToday, goal: user.dailyGoalXp, justReached: goal.justReached, chestGems },
    quests: questUpdates.map((q) => ({
      id: q.id,
      title: q.title,
      progress: q.progress,
      target: q.target,
      justCompleted: q.justCompleted,
    })),
    achievements: newly.map((a) => ({ id: a.id, title: a.label, tier: a.tier })),
    unlockedLessonId,
  };
}

export async function loseHearts(user: CurrentUser, count: number, now: Date = clockNow()): Promise<void> {
  if (count <= 0) return;
  const player = await syncPlayer(user, now);
  const next = spendHearts({ hearts: player.hearts, updatedAt: player.heartsUpdatedAt }, Math.min(count, GAME.hearts.max), now);
  await db.wallet.update({ where: { userId: user.id }, data: { hearts: next.hearts, heartsUpdatedAt: next.updatedAt } });
}

/** Spend gems on a full heart refill (the shop item), e.g. from the out-of-hearts screen. */
export async function refillHeartsWithGems(user: CurrentUser, now: Date = clockNow()): Promise<RefillResult> {
  const result = await buyItem(user, "heart-refill", now);
  return result.ok
    ? { ok: true, hearts: result.wallet.hearts, gems: result.wallet.gems }
    : { ok: false, hearts: result.hearts, gems: result.gems, error: result.error };
}

/** Purchase a shop item for the user. */
export async function buyItem(user: CurrentUser, itemId: string, now: Date = clockNow()) {
  const item = shopItemById(itemId);
  const player = await syncPlayer(user, now);
  if (!item) return { ok: false as const, error: "Unknown item", hearts: player.hearts, gems: player.wallet.gems };
  const result = purchase(item, player.wallet, now);
  if (!result.ok) {
    return { ok: false as const, error: PURCHASE_ERROR_MESSAGES[result.reason], hearts: player.hearts, gems: player.wallet.gems };
  }
  const w = result.wallet;
  const refilled = item.kind === "heartRefill";
  await db.$transaction([
    db.wallet.update({
      where: { userId: user.id },
      data: {
        gems: w.gems,
        hearts: w.hearts,
        heartsUpdatedAt: refilled ? now : player.heartsUpdatedAt,
        streakFreezes: w.streakFreezes,
        cosmetics: JSON.stringify(w.cosmetics),
        boosts: JSON.stringify({ doubleXpUntil: w.doubleXpUntil }),
      },
    }),
    db.purchase.create({ data: { userId: user.id, itemId: item.id, cost: item.price, at: now } }),
  ]);
  return { ok: true as const, wallet: w, item };
}
