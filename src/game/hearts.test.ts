import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import {
  fullHeartsAt,
  HEART_REGEN_MS,
  nextHeartAt,
  refillHearts,
  regenHearts,
  restoreHearts,
  spendHearts,
  type HeartState,
} from "./hearts";

const T0 = new Date("2026-10-26T10:00:00Z");
const at = (hours: number) => new Date(T0.getTime() + hours * 3_600_000);
const state = (hearts: number, updatedAt = T0): HeartState => ({ hearts, updatedAt });

describe("regenHearts", () => {
  it("regenerates every 4 hours by default", () => {
    expect(GAME.hearts.regenHours).toBe(4);
    expect(HEART_REGEN_MS).toBe(4 * 3_600_000);
  });

  it.each([
    // hearts, hours later, expected hearts, expected anchor (hours after T0)
    [2, 0, 2, 0],
    [2, 3.99, 2, 0],
    [2, 4, 3, 4],
    [2, 5, 3, 4], // partial hour kept: anchor moves by whole intervals only
    [2, 8, 4, 8],
    [2, 11.5, 4, 8],
    [2, 12, 5, 12],
    [2, 100, 5, 12], // capped; anchor is when it became full
    [0, 20, 5, 20],
    [4, 4, 5, 4],
  ])("%d hearts after %dh → %d (anchor +%dh)", (hearts, hours, expected, anchor) => {
    const out = regenHearts(state(hearts), at(hours));
    expect(out.hearts).toBe(expected);
    expect(out.updatedAt.getTime()).toBe(at(anchor).getTime());
  });

  it("keeps partial progress across repeated calls", () => {
    let s = state(1);
    for (const h of [1, 2.5, 3.9, 4.1, 6, 7.99, 8.01]) s = regenHearts(s, at(h));
    expect(s.hearts).toBe(3);
    expect(s.updatedAt.getTime()).toBe(at(8).getTime());
    // Same as one big jump
    expect(regenHearts(state(1), at(8.01))).toEqual(s);
  });

  it("leaves full hearts alone", () => {
    expect(regenHearts(state(5), at(50))).toEqual(state(5));
  });

  it("does nothing if the clock goes backwards", () => {
    expect(regenHearts(state(2), at(-10))).toEqual(state(2));
  });

  it("is unaffected by DST (it counts real elapsed time)", () => {
    // US DST starts 2026-03-08 02:00 local; 4 real hours later is a heart regardless of wall clock.
    const before = new Date("2026-03-08T06:30:00Z"); // 01:30 EST
    const after = new Date("2026-03-08T10:30:00Z"); // 06:30 EDT (5 wall-clock hours later)
    expect(regenHearts({ hearts: 3, updatedAt: before }, after).hearts).toBe(4);
  });
});

describe("nextHeartAt / fullHeartsAt", () => {
  it("returns null when full", () => {
    expect(nextHeartAt(state(5), T0)).toBeNull();
    expect(fullHeartsAt(state(5), T0)).toBeNull();
    expect(nextHeartAt(state(3), at(8))).toBeNull();
  });

  it("returns the next whole interval", () => {
    expect(nextHeartAt(state(3), at(1))?.toISOString()).toBe(at(4).toISOString());
    expect(nextHeartAt(state(3), at(5))?.toISOString()).toBe(at(8).toISOString());
    expect(fullHeartsAt(state(3), at(1))?.toISOString()).toBe(at(8).toISOString());
    expect(fullHeartsAt(state(0), at(5))?.toISOString()).toBe(at(20).toISOString());
  });
});

describe("spendHearts", () => {
  it("starts the regen clock when dropping from full", () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const out = spendHearts({ hearts: 5, updatedAt: old }, 1, at(2));
    expect(out).toEqual({ hearts: 4, updatedAt: at(2) });
    expect(nextHeartAt(out, at(2))?.toISOString()).toBe(at(6).toISOString());
  });

  it("keeps the existing regen clock when already below full", () => {
    expect(spendHearts(state(3), 1, at(2))).toEqual({ hearts: 2, updatedAt: T0 });
  });

  it("applies regeneration before spending", () => {
    // 2 hearts at T0, 5h later regen to 3 (anchor +4h), then spend 2
    expect(spendHearts(state(2), 2, at(5))).toEqual({ hearts: 1, updatedAt: at(4) });
  });

  it("never goes below zero and ignores non-positive counts", () => {
    expect(spendHearts(state(1), 3, T0).hearts).toBe(0);
    expect(spendHearts(state(3), 0, T0)).toEqual(state(3));
    expect(spendHearts(state(3), -2, T0)).toEqual(state(3));
  });
});

describe("restoreHearts / refillHearts", () => {
  it("gives a heart back without losing regen progress", () => {
    expect(restoreHearts(state(2), 1, at(3))).toEqual({ hearts: 3, updatedAt: T0 });
  });

  it("caps at max", () => {
    expect(restoreHearts(state(4), 3, at(1))).toEqual({ hearts: 5, updatedAt: at(1) });
    expect(restoreHearts(state(5), 1, at(1))).toEqual(state(5));
  });

  it("refills to max", () => {
    expect(refillHearts(at(1))).toEqual({ hearts: GAME.hearts.max, updatedAt: at(1) });
  });
});
