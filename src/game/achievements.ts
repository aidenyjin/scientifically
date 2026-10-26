/** Lifetime totals the achievements are measured against (computed by the caller from the DB). */
export interface AchievementTotals {
  /** Longest streak ever (Streak.longest). */
  longestStreak: number;
  totalXp: number;
  perfectLessons: number;
  lessonsCompleted: number;
  unitsCompleted: number;
  /** Weeks finished at rank 1 in a league. */
  leagueWins: number;
  gemsSpent: number;
}

export type AchievementMetric = keyof AchievementTotals;

export interface AchievementTier {
  threshold: number;
  rewardGems: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  /** "{n}" is replaced by the tier's threshold; "{s}" by "s" unless it is 1. */
  description: string;
  icon: string;
  metric: AchievementMetric;
  /** Ascending thresholds. Tier numbers are 1-based (I, II, III…). */
  tiers: readonly AchievementTier[];
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "chain-reaction",
    title: "Chain Reaction",
    description: "Reach a {n}-day streak",
    icon: "🔥",
    metric: "longestStreak",
    tiers: [
      { threshold: 3, rewardGems: 10 },
      { threshold: 7, rewardGems: 25 },
      { threshold: 14, rewardGems: 50 },
      { threshold: 30, rewardGems: 100 },
      { threshold: 100, rewardGems: 250 },
      { threshold: 365, rewardGems: 500 },
    ],
  },
  {
    id: "big-bang",
    title: "Big Bang",
    description: "Earn {n} XP in total",
    icon: "💥",
    metric: "totalXp",
    tiers: [
      { threshold: 100, rewardGems: 10 },
      { threshold: 500, rewardGems: 25 },
      { threshold: 1000, rewardGems: 50 },
      { threshold: 2500, rewardGems: 100 },
      { threshold: 5000, rewardGems: 200 },
      { threshold: 10000, rewardGems: 400 },
    ],
  },
  {
    id: "precision",
    title: "Precision Instrument",
    description: "Finish {n} lesson{s} without a mistake",
    icon: "🎯",
    metric: "perfectLessons",
    tiers: [
      { threshold: 1, rewardGems: 10 },
      { threshold: 5, rewardGems: 25 },
      { threshold: 20, rewardGems: 50 },
      { threshold: 50, rewardGems: 100 },
      { threshold: 100, rewardGems: 200 },
    ],
  },
  {
    id: "lab-regular",
    title: "Lab Regular",
    description: "Complete {n} lesson{s}",
    icon: "🧪",
    metric: "lessonsCompleted",
    tiers: [
      { threshold: 1, rewardGems: 5 },
      { threshold: 10, rewardGems: 20 },
      { threshold: 50, rewardGems: 50 },
      { threshold: 100, rewardGems: 100 },
      { threshold: 250, rewardGems: 250 },
    ],
  },
  {
    id: "field-expert",
    title: "Field Expert",
    description: "Complete {n} unit{s}",
    icon: "🔬",
    metric: "unitsCompleted",
    tiers: [
      { threshold: 1, rewardGems: 20 },
      { threshold: 3, rewardGems: 50 },
      { threshold: 6, rewardGems: 100 },
      { threshold: 12, rewardGems: 200 },
    ],
  },
  {
    id: "top-of-the-table",
    title: "Top of the Periodic Table",
    description: "Finish 1st in {n} league{s}",
    icon: "🏆",
    metric: "leagueWins",
    tiers: [
      { threshold: 1, rewardGems: 50 },
      { threshold: 3, rewardGems: 100 },
      { threshold: 10, rewardGems: 250 },
    ],
  },
  {
    id: "research-grant",
    title: "Research Grant",
    description: "Spend {n} gems in the shop",
    icon: "💎",
    metric: "gemsSpent",
    tiers: [
      { threshold: 500, rewardGems: 25 },
      { threshold: 2000, rewardGems: 75 },
      { threshold: 5000, rewardGems: 150 },
    ],
  },
];

export interface UnlockedTier {
  id: string;
  tier: number;
}

export interface NewUnlock {
  id: string;
  /** 1-based tier. */
  tier: number;
  /** Achievement title without the tier, e.g. "Big Bang". */
  title: string;
  /** Title with the tier numeral, e.g. "Big Bang II". */
  label: string;
  /** Tier-specific description, e.g. "Earn 500 XP in total". */
  description: string;
  icon: string;
  rewardGems: number;
}

/** "I", "II", "III", "IV"… */
export function tierLabel(tier: number): string {
  // prettier-ignore
  const numerals: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = Math.max(0, Math.floor(tier));
  let out = "";
  for (const [value, symbol] of numerals) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function describeTier(def: AchievementDef, tier: number): string {
  const t = def.tiers[tier - 1] ?? def.tiers[def.tiers.length - 1];
  return def.description
    .replace("{n}", t.threshold.toLocaleString("en-US"))
    .replace("{s}", t.threshold === 1 ? "" : "s");
}

/** Every tier reached by `totals` that isn't in `unlocked` (several tiers can unlock at once). */
export function evaluateAchievements(
  totals: AchievementTotals,
  unlocked: readonly UnlockedTier[],
  defs: readonly AchievementDef[] = ACHIEVEMENTS,
): NewUnlock[] {
  const have = new Set(unlocked.map((u) => `${u.id}#${u.tier}`));
  const out: NewUnlock[] = [];
  for (const def of defs) {
    const value = totals[def.metric] ?? 0;
    def.tiers.forEach((t, i) => {
      const tier = i + 1;
      if (value >= t.threshold && !have.has(`${def.id}#${tier}`)) {
        out.push({
          id: def.id,
          tier,
          title: def.title,
          label: `${def.title} ${tierLabel(tier)}`,
          description: describeTier(def, tier),
          icon: def.icon,
          rewardGems: t.rewardGems,
        });
      }
    });
  }
  return out;
}

export interface AchievementProgress {
  id: string;
  title: string;
  icon: string;
  /** Highest tier unlocked (0 = none yet). */
  tier: number;
  maxTier: number;
  /** Current value of the metric. */
  value: number;
  /** Threshold of the next tier, or null when every tier is unlocked. */
  nextThreshold: number | null;
  /** value / nextThreshold, 0–1 (1 when complete). */
  progress: number;
  /** Describes the next tier (or the top tier once complete). */
  description: string;
  complete: boolean;
}

/** One entry per achievement, for the profile grid. */
export function achievementProgress(
  totals: AchievementTotals,
  unlocked: readonly UnlockedTier[],
  defs: readonly AchievementDef[] = ACHIEVEMENTS,
): AchievementProgress[] {
  return defs.map((def) => {
    const value = Math.max(0, totals[def.metric] ?? 0);
    const tier = Math.min(
      def.tiers.length,
      unlocked.filter((u) => u.id === def.id).reduce((max, u) => Math.max(max, u.tier), 0),
    );
    const next = def.tiers[tier];
    const complete = next === undefined;
    return {
      id: def.id,
      title: def.title,
      icon: def.icon,
      tier,
      maxTier: def.tiers.length,
      value,
      nextThreshold: next ? next.threshold : null,
      progress: next ? Math.min(1, value / next.threshold) : 1,
      description: describeTier(def, complete ? def.tiers.length : tier + 1),
      complete,
    };
  });
}
