import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { reactionFor, reactionPool } from "./reactions";
import { EXPRESSIONS, type ReactionEvent } from "./types";

const EVENTS: ReactionEvent[] = [
  "correct",
  "incorrect",
  "combo5",
  "combo10",
  "lessonComplete",
  "perfect",
  "failed",
  "streakExtended",
  "streakLost",
  "dailyGoal",
  "levelUp",
  "leaguePromoted",
  "idle",
];

describe("reactions", () => {
  it("has 3–5 short lines with valid expressions for every character × event", () => {
    for (const id of CHARACTER_IDS) {
      for (const event of EVENTS) {
        const pool = reactionPool(event, id);
        expect(pool.length, `${id}.${event}`).toBeGreaterThanOrEqual(3);
        expect(pool.length, `${id}.${event}`).toBeLessThanOrEqual(5);
        for (const r of pool) {
          expect(EXPRESSIONS).toContain(r.expression);
          expect(r.line?.trim().length).toBeGreaterThan(0);
          expect(r.line!.split(/\s+/).length, r.line).toBeLessThanOrEqual(8);
        }
        expect(new Set(pool.map((r) => r.line)).size, `${id}.${event} duplicates`).toBe(pool.length);
      }
    }
  });

  it("is deterministic for a seed and steps through the pool", () => {
    for (const id of CHARACTER_IDS) {
      for (const event of EVENTS) {
        const pool = reactionPool(event, id);
        expect(reactionFor(event, id, 12345)).toEqual(reactionFor(event, id, 12345));
        const seen = new Set(pool.map((_, i) => reactionFor(event, id, i).line));
        expect(seen.size).toBe(pool.length);
        expect(reactionFor(event, id, pool.length)).toEqual(reactionFor(event, id, 0));
      }
    }
  });

  it("handles odd seeds (negative, fractional, huge, NaN)", () => {
    for (const seed of [-1, -999, 2.7, 4294967295, Number.NaN, Infinity]) {
      const r = reactionFor("correct", "lumi", seed);
      expect(reactionPool("correct", "lumi")).toContainEqual(r);
    }
    expect(reactionFor("correct", "lumi", Number.NaN)).toEqual(reactionFor("correct", "lumi", 0));
  });

  it("defaults to seed 0 and keeps the out-of-hearts reaction sad", () => {
    for (const id of CHARACTER_IDS) {
      expect(reactionFor("failed", id)).toEqual(reactionFor("failed", id, 0));
      expect(reactionFor("failed", id).expression).toBe("sad");
    }
  });
});
