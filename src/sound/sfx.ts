"use client";

export type Sfx = "tap" | "correct" | "wrong" | "combo" | "complete" | "fail" | "gem" | "levelUp" | "match";

let enabled = true;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

// PLACEHOLDER — the sound milestone synthesises these with the Web Audio API.
export function play(sound: Sfx): void {
  if (!enabled || typeof window === "undefined") return;
  void sound;
}
