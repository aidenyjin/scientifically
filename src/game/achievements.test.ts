import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  achievementById,
  achievementProgress,
  evaluateAchievements,
  tierLabel,
  type AchievementTotals,
} from "./achievements";

const zero: AchievementTotals = {
  longestStreak: 0,
  totalXp: 0,
  perfectLessons: 0,
  lessonsCompleted: 0,
  unitsCompleted: 0,
  leagueWins: 0,
  gemsSpent: 0,
};
const totals = (over: Partial<AchievementTotals>): AchievementTotals => ({ ...zero, ...over });

describe("ACHIEVEMENTS data", () => {
  it("has unique ids, ascending thresholds and covers every metric", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.tiers.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < a.tiers.length; i++) {
        expect(a.tiers[i].threshold).toBeGreaterThan(a.tiers[i - 1].threshold);
        expect(a.tiers[i].rewardGems).toBeGreaterThanOrEqual(a.tiers[i - 1].rewardGems);
      }
      expect(a.description).toContain("{n}");
    }
    const metrics = new Set(ACHIEVEMENTS.map((a) => a.metric));
    for (const m of Object.keys(zero)) expect(metrics.has(m as keyof AchievementTotals)).toBe(true);
  });
});

describe("tierLabel", () => {
  it.each([
    [1, "I"],
    [2, "II"],
    [3, "III"],
    [4, "IV"],
    [5, "V"],
    [6, "VI"],
    [9, "IX"],
    [14, "XIV"],
  ])("%d → %s", (n, label) => expect(tierLabel(n)).toBe(label));
});

describe("evaluateAchievements", () => {
  it("unlocks nothing at zero", () => {
    expect(evaluateAchievements(zero, [])).toEqual([]);
  });

  it("unlocks the first tier when the threshold is reached", () => {
    expect(evaluateAchievements(totals({ lessonsCompleted: 1 }), [])).toEqual([
      {
        id: "lab-regular",
        tier: 1,
        title: "Lab Regular",
        label: "Lab Regular I",
        description: "Complete 1 lesson",
        icon: "🧪",
        rewardGems: 5,
      },
    ]);
  });

  it("unlocks several tiers at once and skips ones already unlocked", () => {
    const out = evaluateAchievements(totals({ totalXp: 1200 }), [{ id: "big-bang", tier: 1 }]);
    expect(out.map((u) => [u.id, u.tier, u.label, u.rewardGems])).toEqual([
      ["big-bang", 2, "Big Bang II", 25],
      ["big-bang", 3, "Big Bang III", 50],
    ]);
    expect(out[1].description).toBe("Earn 1,000 XP in total");
  });

  it("is idempotent once results are stored", () => {
    const t = totals({
      longestStreak: 30,
      perfectLessons: 5,
      leagueWins: 1,
      gemsSpent: 600,
      unitsCompleted: 3,
    });
    const first = evaluateAchievements(t, []);
    expect(first.length).toBe(4 + 2 + 1 + 1 + 2);
    expect(evaluateAchievements(t, first)).toEqual([]);
  });

  it.each([
    ["chain-reaction", { longestStreak: 7 }, [1, 2]],
    ["chain-reaction", { longestStreak: 6 }, [1]],
    ["precision", { perfectLessons: 20 }, [1, 2, 3]],
    ["field-expert", { unitsCompleted: 12 }, [1, 2, 3, 4]],
    ["top-of-the-table", { leagueWins: 2 }, [1]],
    ["research-grant", { gemsSpent: 499 }, []],
  ] as const)("%s with %o → tiers %o", (id, over, tiers) => {
    expect(
      evaluateAchievements(totals(over), [])
        .filter((u) => u.id === id)
        .map((u) => u.tier),
    ).toEqual(tiers);
  });
});

describe("achievementProgress", () => {
  it("reports progress towards the next tier", () => {
    const grid = achievementProgress(totals({ longestStreak: 5 }), [
      { id: "chain-reaction", tier: 1 },
    ]);
    expect(grid).toHaveLength(ACHIEVEMENTS.length);
    expect(grid.find((g) => g.id === "chain-reaction")).toEqual({
      id: "chain-reaction",
      title: "Chain Reaction",
      icon: "🔥",
      tier: 1,
      maxTier: 6,
      value: 5,
      nextThreshold: 7,
      progress: 5 / 7,
      description: "Reach a 7-day streak",
      complete: false,
    });
  });

  it("uses stored unlocks for the tier (a reward not yet granted shows full progress)", () => {
    const entry = achievementProgress(totals({ totalXp: 600 }), []).find(
      (g) => g.id === "big-bang",
    );
    expect(entry).toMatchObject({ tier: 0, nextThreshold: 100, progress: 1 });
  });

  it("marks completed achievements", () => {
    const def = achievementById("top-of-the-table");
    expect(def).toBeDefined();
    const unlocked = [1, 2, 3].map((tier) => ({ id: "top-of-the-table", tier }));
    const entry = achievementProgress(totals({ leagueWins: 12 }), unlocked).find(
      (g) => g.id === "top-of-the-table",
    );
    expect(entry).toMatchObject({
      tier: 3,
      maxTier: 3,
      nextThreshold: null,
      progress: 1,
      complete: true,
    });
    expect(entry?.description).toBe("Finish 1st in 10 leagues");
  });

  it("starts empty for a new user", () => {
    for (const g of achievementProgress(zero, [])) {
      expect(g).toMatchObject({ tier: 0, progress: 0, complete: false });
      expect(g.nextThreshold).toBeGreaterThan(0);
    }
  });
});
