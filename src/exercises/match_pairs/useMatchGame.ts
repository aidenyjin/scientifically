"use client";

import { useEffect, useRef, useState } from "react";
import { play } from "@/sound/sfx";

export type Side = "left" | "right";
type Selection = Record<Side, number | null>;

/** How long a fresh match glows green before it settles. */
export const FLASH_MS = 450;
/** How long a mismatch stays red before both tiles reset. */
export const WRONG_MS = 400;

/**
 * Live matching state for match_pairs. Tiles are identified by pair index on
 * both sides, so a left and right tile match when their indices are equal.
 */
export function useMatchGame(count: number, onComplete: (mistakes: number) => void) {
  const [selected, setSelected] = useState<Selection>({ left: null, right: null });
  const [matched, setMatched] = useState<ReadonlySet<number>>(() => new Set());
  const [flashing, setFlashing] = useState<ReadonlySet<number>>(() => new Set());
  const [wrong, setWrong] = useState<Record<Side, number> | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const pick = (side: Side, pair: number, describe: (left: number, right: number) => string) => {
    if (matched.has(pair)) return;
    setWrong(null);
    const next: Selection = { ...selected, [side]: selected[side] === pair ? null : pair };
    if (next.left === null || next.right === null) {
      setSelected(next);
      return;
    }
    const { left, right } = next;
    setSelected({ left: null, right: null });

    if (left === right) {
      const nowMatched = new Set(matched).add(left);
      setMatched(nowMatched);
      setFlashing((f) => new Set(f).add(left));
      later(() => setFlashing((f) => new Set([...f].filter((p) => p !== left))), FLASH_MS);
      setAnnouncement(`Matched: ${describe(left, right)}`);
      if (nowMatched.size === count) onComplete(mistakes);
      else play("match");
      return;
    }

    setMistakes((m) => m + 1);
    play("wrong");
    const attempt = { left, right };
    setWrong(attempt);
    setAnnouncement(`Not a match: ${describe(left, right)}`);
    later(() => setWrong((current) => (current === attempt ? null : current)), WRONG_MS);
  };

  return { selected, matched, flashing, wrong, mistakes, announcement, pick };
}
