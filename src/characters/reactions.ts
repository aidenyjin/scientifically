import type { CharacterId, Reaction, ReactionEvent } from "./types";

// PLACEHOLDER — the characters milestone adds per-character line pools.
const DEFAULT: Record<ReactionEvent, Reaction> = {
  correct: { expression: "happy" },
  incorrect: { expression: "sad" },
  combo5: { expression: "celebrate", line: "Five in a row!" },
  combo10: { expression: "celebrate", line: "Ten in a row — unstoppable!" },
  lessonComplete: { expression: "celebrate", line: "Lesson complete!" },
  perfect: { expression: "celebrate", line: "Flawless!" },
  failed: { expression: "sad", line: "Out of hearts. Let's regroup." },
  streakExtended: { expression: "celebrate", line: "Streak extended!" },
  streakLost: { expression: "sad" },
  dailyGoal: { expression: "celebrate", line: "Daily goal reached!" },
  levelUp: { expression: "celebrate" },
  leaguePromoted: { expression: "celebrate" },
  idle: { expression: "neutral" },
};

/** Pick a reaction for an event. `seed` varies the line deterministically. */
export function reactionFor(event: ReactionEvent, _characterId: CharacterId, _seed = 0): Reaction {
  return DEFAULT[event];
}
