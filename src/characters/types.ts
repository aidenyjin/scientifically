import type { CharacterId } from "@/content/schema/exercise-base";

export type { CharacterId };

export const EXPRESSIONS = ["neutral", "happy", "celebrate", "sad", "thinking", "surprised", "sleepy"] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** Engine/game events characters react to. */
export type ReactionEvent =
  | "correct"
  | "incorrect"
  | "combo5"
  | "combo10"
  | "lessonComplete"
  | "perfect"
  | "failed"
  | "streakExtended"
  | "streakLost"
  | "dailyGoal"
  | "levelUp"
  | "leaguePromoted"
  | "idle";

export interface Reaction {
  expression: Expression;
  line?: string;
}
