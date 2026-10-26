// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal fake Web Audio graph that enforces the real API's rules we rely on. */
class FakeParam {
  value = 0;
  events: [string, number, number][] = [];
  setValueAtTime(v: number, t: number) {
    this.events.push(["set", v, t]);
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.events.push(["lin", v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    // The real API throws a RangeError for non-positive targets.
    if (!(v > 0)) throw new RangeError("exponential ramp target must be > 0");
    this.events.push(["exp", v, t]);
    return this;
  }
}

class FakeNode {
  connect() {}
  disconnect() {}
}

let created: { oscillators: number; started: number; stops: number[] };

class FakeOscillator extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  detune = new FakeParam();
  onended: (() => void) | null = null;
  constructor() {
    super();
    created.oscillators++;
  }
  start() {
    created.started++;
  }
  stop(t: number) {
    created.stops.push(t);
  }
}

class FakeContext {
  static instances = 0;
  state = "suspended";
  currentTime = 1;
  destination = new FakeNode();
  constructor() {
    FakeContext.instances++;
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  createOscillator() {
    return new FakeOscillator();
  }
  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam() });
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode(), { type: "lowpass", frequency: new FakeParam(), Q: new FakeParam() });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), {
      threshold: new FakeParam(),
      knee: new FakeParam(),
      ratio: new FakeParam(),
      attack: new FakeParam(),
      release: new FakeParam(),
    });
  }
}

describe("sfx", () => {
  beforeEach(() => {
    vi.resetModules();
    created = { oscillators: 0, started: 0, stops: [] };
    FakeContext.instances = 0;
    vi.stubGlobal("AudioContext", FakeContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("synthesises every sound with valid envelopes, from one lazily created context", async () => {
    const { play, SFX } = await import("./sfx");
    expect(FakeContext.instances).toBe(0);
    for (const s of SFX) {
      const before = created.oscillators;
      expect(() => play(s)).not.toThrow();
      expect(created.oscillators, s).toBeGreaterThan(before);
    }
    expect(FakeContext.instances).toBe(1);
    expect(created.started).toBeGreaterThanOrEqual(created.oscillators);
    // Everything is short: nothing rings on for more than ~1.5 s.
    expect(Math.max(...created.stops)).toBeLessThan(1 + 1.5);
  });

  it("does nothing while sound is disabled, and notifies subscribers", async () => {
    const { play, setSoundEnabled, isSoundEnabled, subscribeSound } = await import("./sfx");
    const seen: boolean[] = [];
    const off = subscribeSound(() => seen.push(isSoundEnabled()));
    setSoundEnabled(false);
    play("correct");
    expect(created.oscillators).toBe(0);
    expect(FakeContext.instances).toBe(0);
    setSoundEnabled(true);
    off();
    setSoundEnabled(false);
    expect(seen).toEqual([false, true]);
  });

  it("is a silent no-op without Web Audio", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { play } = await import("./sfx");
    expect(() => play("gem")).not.toThrow();
    expect(created.oscillators).toBe(0);
  });
});
