import { GAME } from "./config";

/**
 * Hearts regenerate one every `regenHours` while below max. `updatedAt` is the
 * anchor of the regen clock: the last time a heart was gained, or the moment
 * hearts dropped below max. Mirrors Wallet.hearts / Wallet.heartsUpdatedAt.
 */
export interface HeartState {
  hearts: number;
  updatedAt: Date;
}

export const HEART_REGEN_MS = GAME.hearts.regenHours * 3_600_000;

/** Apply regeneration up to `now`. Advances `updatedAt` by whole intervals only, so partial progress is kept. */
export function regenHearts(state: HeartState, now: Date): HeartState {
  const max = GAME.hearts.max;
  if (state.hearts >= max) return { hearts: state.hearts, updatedAt: state.updatedAt };
  const elapsed = now.getTime() - state.updatedAt.getTime();
  // Clock went backwards (or same instant): nothing to add, and never move the anchor back.
  if (elapsed <= 0) return { hearts: Math.max(0, state.hearts), updatedAt: state.updatedAt };
  const hearts = Math.max(0, state.hearts);
  const gained = Math.min(Math.floor(elapsed / HEART_REGEN_MS), max - hearts);
  return {
    hearts: hearts + gained,
    updatedAt: new Date(state.updatedAt.getTime() + gained * HEART_REGEN_MS),
  };
}

/** When the next heart arrives, or null when hearts are full. */
export function nextHeartAt(state: HeartState, now: Date): Date | null {
  const current = regenHearts(state, now);
  if (current.hearts >= GAME.hearts.max) return null;
  return new Date(current.updatedAt.getTime() + HEART_REGEN_MS);
}

/** When hearts will be full again, or null when they already are. */
export function fullHeartsAt(state: HeartState, now: Date): Date | null {
  const current = regenHearts(state, now);
  const missing = GAME.hearts.max - current.hearts;
  if (missing <= 0) return null;
  return new Date(current.updatedAt.getTime() + missing * HEART_REGEN_MS);
}

/** Lose `n` hearts (never below 0). Dropping from full starts the regen clock at `now`. */
export function spendHearts(state: HeartState, n: number, now: Date): HeartState {
  const current = regenHearts(state, now);
  const count = Math.max(0, Math.floor(n));
  if (count === 0) return current;
  const wasFull = current.hearts >= GAME.hearts.max;
  return {
    hearts: Math.max(0, current.hearts - count),
    updatedAt: wasFull ? now : current.updatedAt,
  };
}

/** Gain `n` hearts, capped at max (e.g. a practice lesson gives one back). Partial regen progress is kept. */
export function restoreHearts(state: HeartState, n: number, now: Date): HeartState {
  const current = regenHearts(state, now);
  const count = Math.max(0, Math.floor(n));
  if (count === 0 || current.hearts >= GAME.hearts.max) return current;
  const hearts = Math.min(GAME.hearts.max, current.hearts + count);
  return { hearts, updatedAt: hearts >= GAME.hearts.max ? now : current.updatedAt };
}

/** Full refill (bought with gems). */
export function refillHearts(now: Date): HeartState {
  return { hearts: GAME.hearts.max, updatedAt: now };
}
