import { beforeAll, describe, expect, it } from "vitest";
import type { LessonStats } from "@/engine/lesson";
import { setupTempDatabase } from "@/test/db";

setupTempDatabase();

// Imported after the DB env is set.
const { db } = await import("@/server/db");
const { buildDemoPack } = await import("@/content/demo-pack");
const { savePack } = await import("@/server/repo/packs");
const { createUser } = await import("@/server/repo/users");
const { completeLessonForUser, buyItem, loseHearts } = await import("./lesson-completion");
const { syncPlayer } = await import("./player");

const pack = buildDemoPack();
const lesson = pack.units[0].lessons[0];

function stats(overrides: Partial<LessonStats> = {}): LessonStats {
  return {
    mode: "standard",
    total: 4,
    firstTryCorrect: 4,
    accuracy: 1,
    perfect: true,
    bestCombo: 4,
    heartsLost: 0,
    mistakeIds: [],
    outcomes: lesson.exercises
      .filter((e) => e.type !== "info_card")
      .map((e) => ({ exerciseId: e.id, skillTags: e.skillTags, correctFirstTry: true })),
    ...overrides,
  };
}

async function freshUser(timezone = "UTC") {
  return createUser({ name: "Tester", timezone, activePackId: pack.id });
}

async function reload(id: string) {
  return db.user.findUniqueOrThrow({ where: { id }, include: { wallet: true, streak: true } });
}

const day = (d: string, time = "12:00") => new Date(`${d}T${time}:00Z`);
const complete = async (userId: string, at: Date, s: Partial<LessonStats> = {}) =>
  completeLessonForUser(await reload(userId), { packId: pack.id, lessonId: lesson.id, mode: s.mode ?? "standard", stats: stats(s), durationMs: 60_000 }, at);

beforeAll(async () => {
  await savePack(pack, "published", { source: "test" });
});

describe("lesson completion", () => {
  it("awards XP, gems, progress and starts a streak", async () => {
    const user = await freshUser();
    const summary = await complete(user.id, day("2026-03-02"));
    expect(summary.xp.total).toBeGreaterThanOrEqual(15); // lesson + perfect
    expect(summary.streak).toEqual({ current: 1, extended: true, freezeUsed: false });
    expect(summary.gemsEarned).toBeGreaterThanOrEqual(5);
    expect(summary.unlockedLessonId).toBe(pack.units[0].lessons[1].id);
    const progress = await db.lessonProgress.findMany({ where: { userId: user.id } });
    expect(progress).toHaveLength(1);
    expect(await db.lessonRun.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.leagueMembership.count({ where: { userId: user.id } })).toBe(1);
    expect(summary.quests).toHaveLength(3);
  });

  it("extends the streak once per day and resets after a missed day", async () => {
    const user = await freshUser();
    await complete(user.id, day("2026-03-02"));
    const same = await complete(user.id, day("2026-03-02", "18:00"));
    expect(same.streak).toMatchObject({ current: 1, extended: false });
    const next = await complete(user.id, day("2026-03-03"));
    expect(next.streak).toMatchObject({ current: 2, extended: true });
    const afterGap = await complete(user.id, day("2026-03-05"));
    expect(afterGap.streak).toMatchObject({ current: 1, extended: true });
    expect((await reload(user.id)).streak?.longest).toBe(2);
  });

  it("a streak freeze bought in the shop protects a missed day", async () => {
    const user = await freshUser();
    await complete(user.id, day("2026-03-02"));
    const bought = await buyItem(await reload(user.id), "streak-freeze", day("2026-03-02", "13:00"));
    expect(bought.ok).toBe(true);
    // Miss the 3rd, come back on the 4th.
    const back = await complete(user.id, day("2026-03-04"));
    expect(back.streak).toMatchObject({ current: 2, freezeUsed: true });
    expect((await reload(user.id)).wallet?.streakFreezes).toBe(0);
  });

  it("uses the learner's time zone for days", async () => {
    const user = await freshUser("Asia/Tokyo");
    await complete(user.id, new Date("2026-03-02T14:00:00Z")); // 23:00 Tokyo on the 2nd
    const next = await complete(user.id, new Date("2026-03-02T16:00:00Z")); // 01:00 Tokyo on the 3rd
    expect(next.streak).toMatchObject({ current: 2, extended: true });
  });

  it("spends hearts, regenerates them, and practice earns one back", async () => {
    const user = await freshUser();
    const t = day("2026-03-02");
    const summary = await complete(user.id, t, { heartsLost: 2, perfect: false, firstTryCorrect: 2 });
    expect(summary.hearts).toBe(3);
    const later = await syncPlayer(await reload(user.id), new Date(t.getTime() + 4 * 3_600_000 + 1000));
    expect(later.hearts).toBe(4);
    const practice = await complete(user.id, new Date(t.getTime() + 4 * 3_600_000 + 2000), { mode: "practice" });
    expect(practice.hearts).toBe(5);
  });

  it("losing hearts when quitting is clamped at zero", async () => {
    const user = await freshUser();
    await loseHearts(await reload(user.id), 9, day("2026-03-02"));
    expect((await reload(user.id)).wallet?.hearts).toBe(0);
  });

  it("refuses purchases without enough gems", async () => {
    const user = await freshUser();
    await db.wallet.update({ where: { userId: user.id }, data: { gems: 10 } });
    const result = await buyItem(await reload(user.id), "double-xp", day("2026-03-02"));
    expect(result.ok).toBe(false);
  });

  it("reaching the daily goal grants a chest once", async () => {
    const user = await freshUser();
    await db.user.update({ where: { id: user.id }, data: { dailyGoalXp: 20 } });
    const first = await complete(user.id, day("2026-03-02"), { perfect: false, firstTryCorrect: 3 });
    expect(first.dailyGoal.justReached).toBe(false);
    const second = await complete(user.id, day("2026-03-02", "13:00"), { perfect: false, firstTryCorrect: 3 });
    expect(second.dailyGoal.justReached).toBe(true);
    expect(second.dailyGoal.chestGems).toBeGreaterThan(0);
    const third = await complete(user.id, day("2026-03-02", "14:00"), { perfect: false, firstTryCorrect: 3 });
    expect(third.dailyGoal.justReached).toBe(false);
  });
});
