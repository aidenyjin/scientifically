/** Every tunable game number lives here. */
export const GAME = {
  xp: {
    lesson: 10,
    perfectBonus: 5,
    checkpoint: 20,
    practice: 5,
    /** +1 XP per this many correct answers in a row (counted on the best combo). */
    comboEvery: 5,
  },
  hearts: {
    max: 5,
    regenHours: 4,
    refillCost: 350,
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
  boosts: {
    doubleXpMinutes: 15,
    doubleXpCost: 400,
  },
  leagues: {
    tiers: ["Quark", "Electron", "Atom", "Molecule", "Cell", "Organism", "Planet", "Star", "Nebula", "Galaxy"],
    groupSize: 30,
    promote: 7,
    demote: 5,
  },
  quests: { perDay: 3 },
  practice: { size: 10 },
} as const;
