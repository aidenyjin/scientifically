/**
 * The expression rig: pure data + maths, no React.
 *
 * Every character is drawn from the same set of parts (eyes, lids, brows,
 * mouth, arms). An expression is just a `FaceState` — numbers the parts turn
 * into transforms — so changing expression can morph smoothly instead of
 * swapping artwork.
 */
import type { Expression } from "./types";

export type Pt = readonly [number, number];

export type MouthKind =
  | "smile"
  | "grin"
  | "laugh"
  | "frown"
  | "hmm"
  | "o"
  | "yawn"
  | "flat"
  | "smirk";

/** Arm poses. "chin" is solved with IK to the character's chin anchor. */
export type ArmPose = "rest" | "out" | "wave" | "up" | "hang" | "chin" | "whoa" | "limp";

export type Extra = "sparkles" | "thought" | "pop" | "zzz";

export interface Brow {
  /** Units moved up from the resting brow line. */
  lift: number;
  /** Degrees; positive raises the inner end (worried), negative lowers it (stern). */
  tilt: number;
}

export interface FaceState {
  /** "closed" = happy ^ ^ arcs. */
  eye: "open" | "closed";
  /** Pupil offset as a fraction of the eye radius, [-1, 1]. */
  look: Pt;
  eyeScale: number;
  pupilScale: number;
  /** 0 = lid fully up, 1 = eye shut. */
  upperLid: number;
  /** Degrees; positive drops the outer corners (sad / droopy). */
  lidTilt: number;
  /** 0..1 cheek squint from below (smiling eyes). */
  lowerLid: number;
  brows: readonly [Brow, Brow];
  browOpacity: number;
  mouth: MouthKind;
  blush: number;
  /** [viewer-left arm, viewer-right arm]. */
  arms: readonly [ArmPose, ArmPose];
  extra: Extra | null;
}

const flat: Brow = { lift: 0, tilt: 0 };

export const FACES: Record<Expression, FaceState> = {
  neutral: {
    eye: "open",
    look: [0, 0],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0,
    lidTilt: 0,
    lowerLid: 0,
    brows: [flat, flat],
    browOpacity: 0,
    mouth: "smile",
    blush: 0,
    arms: ["rest", "rest"],
    extra: null,
  },
  happy: {
    eye: "open",
    look: [0, -0.12],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0,
    lidTilt: 0,
    lowerLid: 0.3,
    brows: [{ lift: 1.5, tilt: 0 }, { lift: 1.5, tilt: 0 }],
    browOpacity: 0,
    mouth: "grin",
    blush: 1,
    arms: ["out", "wave"],
    extra: null,
  },
  celebrate: {
    eye: "closed",
    look: [0, 0],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0,
    lidTilt: 0,
    lowerLid: 0,
    brows: [{ lift: 3, tilt: 0 }, { lift: 3, tilt: 0 }],
    browOpacity: 0,
    mouth: "laugh",
    blush: 1,
    arms: ["up", "up"],
    extra: "sparkles",
  },
  sad: {
    eye: "open",
    look: [0, 0.4],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0.3,
    lidTilt: 16,
    lowerLid: 0,
    brows: [{ lift: 0.5, tilt: 20 }, { lift: 0.5, tilt: 20 }],
    browOpacity: 1,
    mouth: "frown",
    blush: 0,
    arms: ["hang", "hang"],
    extra: null,
  },
  thinking: {
    eye: "open",
    look: [0.42, -0.5],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0.12,
    lidTilt: 0,
    lowerLid: 0,
    brows: [{ lift: 0, tilt: -6 }, { lift: 3.5, tilt: 8 }],
    browOpacity: 1,
    mouth: "hmm",
    blush: 0,
    arms: ["rest", "chin"],
    extra: "thought",
  },
  surprised: {
    eye: "open",
    look: [0, 0],
    eyeScale: 1.14,
    pupilScale: 0.74,
    upperLid: 0,
    lidTilt: 0,
    lowerLid: 0,
    brows: [{ lift: 4.5, tilt: 6 }, { lift: 4.5, tilt: 6 }],
    browOpacity: 1,
    mouth: "o",
    blush: 0,
    arms: ["whoa", "whoa"],
    extra: "pop",
  },
  sleepy: {
    eye: "open",
    look: [0, 0.35],
    eyeScale: 1,
    pupilScale: 1,
    upperLid: 0.58,
    lidTilt: 5,
    lowerLid: 0.06,
    brows: [{ lift: -0.5, tilt: 0 }, { lift: -0.5, tilt: 0 }],
    browOpacity: 0,
    mouth: "yawn",
    blush: 0.35,
    arms: ["limp", "limp"],
    extra: "zzz",
  },
};

export type FaceOverrides = Partial<Record<Expression, Partial<FaceState>>>;

export function faceFor(expression: Expression, overrides?: FaceOverrides): FaceState {
  const base = FACES[expression];
  const o = overrides?.[expression];
  return o ? { ...base, ...o } : base;
}

/**
 * Arm angles as [upper, forearm-relative-to-upper], in "outward" degrees:
 * 0 hangs straight down, positive swings away from the body.
 */
export const ARM_POSES: Record<Exclude<ArmPose, "chin">, readonly [number, number]> = {
  rest: [18, -12],
  out: [44, 22],
  wave: [128, 28],
  up: [150, 10],
  hang: [5, -4],
  whoa: [62, 98],
  limp: [9, 2],
};

export type Side = "left" | "right";

/** Converts an outward angle to an SVG rotation (clockwise-positive). */
export function toSvg(side: Side, outward: number): number {
  return side === "left" ? outward : -outward;
}

/** Angle (SVG degrees) that rotates the downward vector (0, 1) onto `v`. */
export function angleOf(v: Pt): number {
  return (Math.atan2(v[1], v[0]) * 180) / Math.PI - 90;
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Forward kinematics: where the hand lands for SVG angles [upper, fore]. */
export function handAt(shoulder: Pt, upper: number, fore: number, angles: readonly [number, number]): Pt {
  const a1 = rad(angles[0]);
  const a2 = rad(angles[0] + angles[1]);
  const ex = shoulder[0] - upper * Math.sin(a1);
  const ey = shoulder[1] + upper * Math.cos(a1);
  return [ex - fore * Math.sin(a2), ey + fore * Math.cos(a2)];
}

function normalise(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Two-bone IK: SVG angles [upper, fore] that put the hand on `target`
 * (clamped to reach), choosing the solution with the lower elbow.
 */
export function solveArm(shoulder: Pt, upper: number, fore: number, target: Pt): readonly [number, number] {
  const dx = target[0] - shoulder[0];
  const dy = target[1] - shoulder[1];
  const raw = Math.hypot(dx, dy);
  const d = Math.min(Math.max(raw, Math.abs(upper - fore) + 0.01), upper + fore - 0.01);
  const phi = angleOf([dx, dy]);
  const cosA = (upper * upper + d * d - fore * fore) / (2 * upper * d);
  const alpha = (Math.acos(Math.min(1, Math.max(-1, cosA))) * 180) / Math.PI;
  // Point on the (possibly clamped) reach circle in the target's direction.
  const t: Pt = [shoulder[0] + (dx / (raw || 1)) * d, shoulder[1] + (dy / (raw || 1)) * d];
  let best: readonly [number, number] = [phi, 0];
  let bestY = -Infinity;
  for (const sign of [1, -1]) {
    const a1 = phi + sign * alpha;
    const ex = shoulder[0] - upper * Math.sin(rad(a1));
    const ey = shoulder[1] + upper * Math.cos(rad(a1));
    const a2 = normalise(angleOf([t[0] - ex, t[1] - ey]) - a1);
    if (ey > bestY) {
      bestY = ey;
      best = [normalise(a1), a2];
    }
  }
  return best;
}

export interface ArmGeometry {
  shoulders: readonly [Pt, Pt];
  upper: number;
  fore: number;
}

/** SVG angles for one arm in a pose. */
export function armAngles(pose: ArmPose, side: Side, arm: ArmGeometry, chin: Pt): readonly [number, number] {
  const shoulder = arm.shoulders[side === "left" ? 0 : 1];
  if (pose === "chin") {
    // Rounded so server and client render identical markup.
    const [u, f] = solveArm(shoulder, arm.upper, arm.fore, chin);
    return [round2(u), round2(f)];
  }
  const [u, f] = ARM_POSES[pose];
  return [toSvg(side, u), toSvg(side, f)];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Deterministic 0..1 value from a string (used to desync idle loops). */
export function phase(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
