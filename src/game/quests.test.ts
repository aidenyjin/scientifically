import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/clock";
import { GAME } from "./config";
import {
  advanceQuest,
  QUEST_POOL,
  questById,
  questProgress,
  questsForDay,
  type QuestEvent,
  type QuestMetric,
} from "./quests";

const event = (over: Partial<QuestEvent> = {}): QuestEvent => ({
  xp: 15,
  mode: "standard",
  perfect: false,
  bestCombo: 3,
  accuracy: 0.8,
  ...over,
});

describe("QUEST_POOL", () => {
  it("has ~10 well-formed quests with unique ids covering every metric", () => {
    expect(QUEST_POOL.length).toBeGreaterThanOrEqual(10);
    expect(new Set(QUEST_POOL.map((q) => q.id)).size).toBe(QUEST_POOL.length);
    const metrics: QuestMetric[] = [
      "xp",
      "lessons",
      "perfectLessons",
      "combo",
      "checkpoint",
      "practice",
      "accuracy90",
    ];
    for (const m of metrics) expect(QUEST_POOL.some((q) => q.metric === m)).toBe(true);
    for (const q of QUEST_POOL) {
      expect(q.target).toBeGreaterThan(0);
      expect(q.rewardGems).toBeGreaterThan(0);
    }
    expect(questById("xp-20")?.title).toBe("Earn 20 XP");
    expect(questById("nope")).toBeUndefined();
  });
});

describe("questsForDay", () => {
  it("is deterministic per user and date", () => {
    expect(questsForDay("2026-10-26", "u1")).toEqual(questsForDay("2026-10-26", "u1"));
  });

  it("picks 3 quests with distinct metrics, ramping easy → hard, across many days", () => {
    const combos = new Set<string>();
    let day = "2026-01-01";
    for (let i = 0; i < 365; i++) {
      for (const user of ["u1", "demo-user"]) {
        const quests = questsForDay(day, user);
        expect(quests).toHaveLength(GAME.quests.perDay);
        expect(new Set(quests.map((q) => q.metric)).size).toBe(3);
        expect(quests.map((q) => q.difficulty)).toEqual([1, 2, 3]);
        combos.add(quests.map((q) => q.id).join());
      }
      day = addDays(day, 1);
    }
    // plenty of variety
    expect(combos.size).toBeGreaterThan(20);
  });

  it("varies between days and users", () => {
    const days = Array.from({ length: 14 }, (_, i) =>
      questsForDay(addDays("2026-10-01", i), "u1")
        .map((q) => q.id)
        .join(),
    );
    expect(new Set(days).size).toBeGreaterThan(3);
    const users = Array.from({ length: 14 }, (_, i) =>
      questsForDay("2026-10-01", `user-${i}`)
        .map((q) => q.id)
        .join(),
    );
    expect(new Set(users).size).toBeGreaterThan(3);
  });

  it("respects excluded metrics and still returns 3 varied quests", () => {
    for (let i = 0; i < 60; i++) {
      const quests = questsForDay(addDays("2026-10-01", i), "u1", {
        exclude: ["checkpoint", "practice"],
      });
      expect(quests).toHaveLength(3);
      expect(quests.some((q) => q.metric === "checkpoint" || q.metric === "practice")).toBe(false);
      expect(new Set(quests.map((q) => q.metric)).size).toBe(3);
    }
  });

  it("returns fewer quests if exclusions leave too few metrics", () => {
    const quests = questsForDay("2026-10-26", "u1", {
      exclude: ["checkpoint", "practice", "accuracy90", "combo", "perfectLessons"],
    });
    expect(quests.map((q) => q.metric).sort()).toEqual(["lessons", "xp"]);
  });
});

describe("questProgress", () => {
  it.each([
    ["xp", event({ xp: 17 }), 17],
    ["xp", event({ xp: -3 }), 0],
    ["lessons", event(), 1],
    ["lessons", event({ mode: "practice" }), 1],
    ["perfectLessons", event({ perfect: true }), 1],
    ["perfectLessons", event({ perfect: false }), 0],
    ["combo", event({ bestCombo: 8 }), 8],
    ["checkpoint", event({ mode: "checkpoint" }), 1],
    ["checkpoint", event({ mode: "standard" }), 0],
    ["practice", event({ mode: "practice" }), 1],
    ["practice", event({ mode: "checkpoint" }), 0],
    ["accuracy90", event({ accuracy: 0.9 }), 1],
    ["accuracy90", event({ accuracy: 0.89 }), 0],
  ] as const)("%s", (metric, e, expected) => {
    expect(questProgress({ metric }, e)).toBe(expected);
  });
});

describe("advanceQuest", () => {
  it("adds increments and caps at the target", () => {
    const quest = { metric: "xp", target: 40 } as const;
    expect(advanceQuest(quest, 0, event({ xp: 15 }))).toEqual({
      progress: 15,
      completed: false,
      justCompleted: false,
    });
    expect(advanceQuest(quest, 30, event({ xp: 15 }))).toEqual({
      progress: 40,
      completed: true,
      justCompleted: true,
    });
    expect(advanceQuest(quest, 40, event({ xp: 15 }))).toEqual({
      progress: 40,
      completed: true,
      justCompleted: false,
    });
  });

  it("keeps the best combo instead of summing", () => {
    const quest = { metric: "combo", target: 10 } as const;
    expect(advanceQuest(quest, 6, event({ bestCombo: 4 }))).toMatchObject({
      progress: 6,
      completed: false,
    });
    expect(advanceQuest(quest, 6, event({ bestCombo: 8 }))).toMatchObject({
      progress: 8,
      completed: false,
    });
    expect(advanceQuest(quest, 8, event({ bestCombo: 12 }))).toEqual({
      progress: 10,
      completed: true,
      justCompleted: true,
    });
  });

  it("does not move on events that don't count", () => {
    expect(advanceQuest({ metric: "checkpoint", target: 1 }, 0, event())).toEqual({
      progress: 0,
      completed: false,
      justCompleted: false,
    });
  });
});
