"use client";

import confetti from "canvas-confetti";

/** The cast's palette: ink blue, ochre, sage, clay, stone. */
const COLORS = ["#2d4a7a", "#c29a1e", "#9db596", "#b4463b", "#d9cfc1", "#e8c77e"];

/** Celebration burst from both lower corners. */
export function fireConfetti(size: "normal" | "big" = "normal"): void {
  if (typeof window === "undefined") return;
  const count = size === "big" ? 120 : 70;
  const base = { particleCount: count / 2, spread: 70, startVelocity: 55, ticks: 220, colors: COLORS, scalar: 0.9 };
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.9 } });
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.9 } });
}
