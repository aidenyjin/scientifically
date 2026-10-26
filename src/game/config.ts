/** Every tunable game number lives here. */
export const GAME = {
  xp: {
    lesson: 10,
    perfectBonus: 5,
    checkpoint: 20,
    practice: 5,
    /** +1 XP per this many correct answers in a row (counted on the best combo). */
    comboEvery: 5,
    /** Levels: going from level n to n+1 costs `levelBase + levelStep * (n - 1)` XP. */
    levelBase: 60,
    levelStep: 30,
  },
  hearts: {
    max: 5,
    regenHours: 4,
    refillCost: 350,
    /** Hearts a completed practice lesson gives back. */
    practiceRestore: 1,
  },
  gems: {
    perLesson: 5,
    chestMin: 5,
    chestMax: 20,
    starting: 500,
  },
  streak: {
    freezeCost: 200,
    maxFreezes: 2,
  },
  dailyGoalOptions: [10, 20, 30, 50] as const,
  dailyGoalDefault: 20,
  boosts: {
    doubleXpMinutes: 15,
    doubleXpCost: 400,
  },
  leagues: {
    tiers: ["Quark", "Electron", "Atom", "Molecule", "Cell", "Organism", "Planet", "Star", "Nebula", "Galaxy"],
    groupSize: 30,
    promote: 7,
    demote: 5,
    /** Real users of one tier+week are hashed into this many groups (1 = everyone shares a league). */
    groupBuckets: 1,
    bots: {
      /** Play sessions a bot has in a week, from its laziest to its keenest. */
      minSessions: 2,
      maxSessions: 14,
      /** Keenness is random() ** keenSkew: > 1 makes most bots casual and a few very keen. */
      keenSkew: 1.8,
      /** Lessons per session (upper bound, before the tier boost). */
      maxLessonsPerSession: 2,
      /** Chance a session is a binge (3× the lessons). */
      bingeChance: 0.08,
      /** XP a bot earns per lesson (inclusive range). */
      lessonXpMin: 10,
      lessonXpMax: 16,
      /** Each tier above Quark multiplies bot activity by (1 + tierGrowth * tier). */
      tierGrowth: 0.25,
    },
  },
  quests: { perDay: 3 },
  practice: { size: 10 },
  srs: {
    /** First correct answer schedules the next review this many days out. */
    firstIntervalDays: 1,
    /** On-time correct answers multiply the interval by this. */
    growth: 2.2,
    maxIntervalDays: 120,
    /** A wrong answer resets the interval to this. */
    wrongIntervalDays: 0.5,
    /** Correct: strength += (1 - strength) * correctGain (scaled down when reviewed early). */
    correctGain: 0.35,
    /** Wrong: strength *= wrongFactor. */
    wrongFactor: 0.5,
    /** After the due date strength halves every max(interval, this) days. */
    minHalfLifeDays: 2,
    /** Wrong answers newer than this count as "recent mistakes" when picking practice. */
    mistakeWindowDays: 14,
  },
} as const;
