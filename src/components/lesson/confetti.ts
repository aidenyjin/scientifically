"use client";

import confetti from "canvas-confetti";

const COLORS = ["#6c5ce7", "#2bc46b", "#ffc800", "#1cb0f6", "#ff4b6e", "#ff9600"];

/** Celebration burst from both lower corners. */
export function fireConfetti(size: "normal" | "big" = "normal"): void {
  if (typeof window === "undefined") return;
  const count = size === "big" ? 160 : 90;
  const base = { particleCount: count / 2, spread: 70, startVelocity: 55, ticks: 220, colors: COLORS, scalar: 1.05 };
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.9 } });
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.9 } });
}
