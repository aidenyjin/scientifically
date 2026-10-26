"use client";

/**
 * Sound effects, synthesised with the Web Audio API (no audio files).
 * One AudioContext is created lazily on the first play() — browsers only let
 * it start after a user gesture, which every caller of play() follows.
 * Every note has a ramped envelope (no clicks) and the mix runs through a
 * gentle compressor at a modest master volume.
 */
export type Sfx = "tap" | "correct" | "wrong" | "combo" | "complete" | "fail" | "gem" | "levelUp" | "match";

export const SFX: readonly Sfx[] = ["tap", "correct", "wrong", "combo", "complete", "fail", "gem", "levelUp", "match"];

const MASTER_GAIN = 0.25;

/* --------------------------------------------------------------- setting */

let enabled = true;
const listeners = new Set<() => void>();

export function setSoundEnabled(value: boolean): void {
  if (enabled === value) return;
  enabled = value;
  listeners.forEach((l) => l());
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Subscribe to setSoundEnabled changes (for useSyncExternalStore). */
export function subscribeSound(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/* ----------------------------------------------------------------- engine */

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;

function engine(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    bus = ctx.createGain();
    bus.gain.value = MASTER_GAIN;
    bus.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return bus ? { ac: ctx, out: bus } : null;
}

interface Note {
  /** Frequency (Hz). */
  f: number;
  /** Start offset (s). */
  t: number;
  /** Length (s), to silence. */
  d: number;
  type?: OscillatorType;
  /** Peak gain. */
  g?: number;
  /** Attack (s). */
  a?: number;
  /** Glide to this frequency over the note. */
  to?: number;
  /** Low-pass cutoff (Hz) to soften bright waves. */
  lp?: number;
  /** Vibrato depth in cents (5.5 Hz). */
  vib?: number;
  detune?: number;
}

const SILENT = 0.0001;

function note(ac: AudioContext, out: AudioNode, t0: number, n: Note): void {
  const start = t0 + n.t;
  const end = start + n.d;
  const osc = ac.createOscillator();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.f, start);
  if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + n.d * 0.85);
  if (n.detune) osc.detune.setValueAtTime(n.detune, start);

  const amp = ac.createGain();
  const peak = n.g ?? 0.4;
  const attack = Math.min(n.a ?? 0.006, n.d / 3);
  amp.gain.setValueAtTime(SILENT, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + attack);
  amp.gain.exponentialRampToValueAtTime(SILENT, end);

  let src: AudioNode = osc;
  if (n.lp) {
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(n.lp, start);
    filter.Q.setValueAtTime(0.6, start);
    osc.connect(filter);
    src = filter;
  }
  let lfo: OscillatorNode | null = null;
  if (n.vib) {
    lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.setValueAtTime(5.5, start);
    depth.gain.setValueAtTime(n.vib, start);
    lfo.connect(depth);
    depth.connect(osc.detune);
    lfo.start(start);
    lfo.stop(end + 0.05);
  }
  src.connect(amp);
  amp.connect(out);
  osc.start(start);
  osc.stop(end + 0.05);
  osc.onended = () => {
    amp.disconnect();
    lfo?.disconnect();
  };
}

/** A soft chime: sine fundamental, a little triangle body and an octave shimmer. */
function chime(f: number, t: number, d: number, g: number): Note[] {
  return [
    { f, t, d, g },
    { f, t, d: d * 0.8, g: g * 0.3, type: "triangle" },
    { f: f * 2, t, d: d * 0.45, g: g * 0.16 },
  ];
}

// Equal-tempered note frequencies used below.
const N = {
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  B3: 246.94,
  Eb4: 311.13,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  B6: 1975.53,
  C7: 2093.0,
  E7: 2637.02,
  G7: 3135.96,
};

const SOUNDS: Record<Sfx, () => Note[]> = {
  // A soft, short tick.
  tap: () => [
    { f: 1500, to: 900, t: 0, d: 0.05, g: 0.18, a: 0.002 },
    { f: 3000, t: 0, d: 0.018, g: 0.04, a: 0.001, type: "triangle" },
  ],
  // Bright two-note rising chime.
  correct: () => [...chime(N.A5, 0, 0.2, 0.42), ...chime(N.E6, 0.085, 0.42, 0.42)],
  // Soft, low two-note fall — a gentle "uh-oh", never a buzzer.
  wrong: () => [
    { f: N.Eb4, t: 0, d: 0.16, g: 0.2, type: "square", lp: 900, a: 0.01 },
    { f: N.Eb4 / 2, t: 0, d: 0.16, g: 0.18, a: 0.01 },
    { f: N.B3, to: N.B3 * 0.96, t: 0.13, d: 0.3, g: 0.2, type: "square", lp: 760, a: 0.012 },
    { f: N.B3 / 2, t: 0.13, d: 0.3, g: 0.18, a: 0.012 },
  ],
  // Quick ascending arpeggio.
  combo: () => [
    ...chime(N.C6, 0, 0.16, 0.3),
    ...chime(N.E6, 0.055, 0.16, 0.3),
    ...chime(N.G6, 0.11, 0.18, 0.3),
    ...chime(N.C7, 0.165, 0.38, 0.32),
  ],
  // Cheerful five-note fanfare ending on a chord.
  complete: () => [
    ...chime(N.C5, 0, 0.16, 0.34),
    ...chime(N.E5, 0.11, 0.16, 0.34),
    ...chime(N.G5, 0.22, 0.16, 0.34),
    ...chime(N.E5, 0.33, 0.12, 0.26),
    ...chime(N.C6, 0.42, 0.8, 0.36),
    { f: N.G5, t: 0.42, d: 0.8, g: 0.16, type: "triangle", vib: 8 },
    { f: N.E6, t: 0.44, d: 0.7, g: 0.12, vib: 8 },
  ],
  // Gentle three-note descent.
  fail: () => [
    { f: N.G4, t: 0, d: 0.26, g: 0.26, type: "triangle", lp: 1800 },
    { f: N.E4, t: 0.2, d: 0.26, g: 0.26, type: "triangle", lp: 1600 },
    { f: N.C4, t: 0.4, d: 0.6, g: 0.28, type: "triangle", lp: 1400, vib: 10 },
    { f: N.C4 / 2, t: 0.4, d: 0.6, g: 0.14 },
  ],
  // Sparkly high pings.
  gem: () => [
    { f: N.E7, t: 0, d: 0.16, g: 0.16 },
    { f: N.G7, t: 0.05, d: 0.16, g: 0.14 },
    { f: N.C7 * 2, t: 0.1, d: 0.22, g: 0.12 },
    { f: N.G7, t: 0.17, d: 0.28, g: 0.1 },
    { f: N.C7, t: 0, d: 0.3, g: 0.08, type: "triangle" },
  ],
  // A rising sweep into a bright, shimmering chord.
  levelUp: () => [
    { f: 420, to: 1400, t: 0, d: 0.24, g: 0.1, type: "triangle" },
    ...chime(N.G5, 0.04, 0.14, 0.26),
    ...chime(N.B5, 0.1, 0.14, 0.26),
    ...chime(N.D6, 0.16, 0.14, 0.26),
    ...chime(N.G6, 0.24, 0.9, 0.3),
    { f: N.B5, t: 0.24, d: 0.9, g: 0.14, type: "triangle", vib: 9 },
    { f: N.D6, t: 0.24, d: 0.9, g: 0.12, vib: 9 },
    { f: N.B6, t: 0.3, d: 0.5, g: 0.06 },
  ],
  // A light bubble pop.
  match: () => [
    { f: 480, to: 1050, t: 0, d: 0.08, g: 0.3, a: 0.003 },
    { f: 1600, t: 0.005, d: 0.03, g: 0.05, a: 0.002, type: "triangle" },
  ],
};

/** Play a sound effect. Silently does nothing when sound is off or unsupported. */
export function play(sound: Sfx): void {
  if (!enabled) return;
  const e = engine();
  if (!e) return;
  const t0 = e.ac.currentTime + 0.01;
  try {
    for (const n of SOUNDS[sound]()) note(e.ac, e.out, t0, n);
  } catch {
    // Audio is decoration; never let it break the lesson.
  }
}
