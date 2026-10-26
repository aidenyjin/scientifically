import type { Expression } from "@/characters/types";
import type { Dialogue } from "./schema";

export type Side = "left" | "right";

export interface LaidOutLine {
  side: Side;
  /** First line of a run by the same speaker: show avatar, name and tail. */
  startsRun: boolean;
}

/** The first speaker sits on the left; the side flips whenever the speaker changes. */
export function layoutLines(lines: Dialogue["lines"]): LaidOutLine[] {
  let side: Side = "left";
  return lines.map((line, i) => {
    const startsRun = i === 0 || lines[i - 1].characterId !== line.characterId;
    if (i > 0 && startsRun) side = side === "left" ? "right" : "left";
    return { side, startsRun };
  });
}

/** A light touch of acting from punctuation; the result overrides it after Check. */
export function expressionForLine(
  text: string,
  status: "answering" | "correct" | "incorrect",
): Expression {
  if (status === "correct") return "happy";
  if (status === "incorrect") return "sad";
  const t = text.trim();
  if (/[?!]{2,}$/.test(t) || /\?!|!\?/.test(t)) return "surprised";
  if (t.endsWith("?")) return "thinking";
  if (t.includes("!")) return "happy";
  return "neutral";
}
