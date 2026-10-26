import { describe, expect, it } from "vitest";
import { ART } from "./bodies";
import { angleOf, armAngles, ARM_POSES, FACES, faceFor, handAt, phase, solveArm, type Pt } from "./rig";
import { EXPRESSIONS } from "./types";

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe("rig", () => {
  it("defines a face for every expression", () => {
    for (const e of EXPRESSIONS) expect(FACES[e]).toBeDefined();
  });

  it("angleOf maps the downward vector to 0 and is clockwise-positive", () => {
    expect(angleOf([0, 1])).toBeCloseTo(0);
    expect(handAt([0, 0], 10, 0, [90, 0])[0]).toBeCloseTo(-10);
    expect(handAt([0, 0], 10, 0, [-90, 0])[0]).toBeCloseTo(10);
  });

  it("IK puts the hand on reachable targets with the elbow below the line", () => {
    const shoulder: Pt = [80, 80];
    for (const target of [
      [68, 72],
      [70, 90],
      [88, 70],
      [75, 64],
    ] as Pt[]) {
      const angles = solveArm(shoulder, 10, 9, target);
      expect(dist(handAt(shoulder, 10, 9, angles), target)).toBeLessThan(0.05);
      const other: readonly [number, number] = [angles[0] - 2 * (angles[0] - angleOf([target[0] - 80, target[1] - 80])), -angles[1]];
      const elbowY = (a: readonly [number, number]) => handAt(shoulder, 10, 0, a)[1];
      expect(elbowY(angles)).toBeGreaterThanOrEqual(elbowY(other) - 1e-6);
    }
  });

  it("IK reaches as far as it can toward out-of-range targets", () => {
    const angles = solveArm([0, 0], 10, 9, [0, -100]);
    const hand = handAt([0, 0], 10, 9, angles);
    expect(Math.hypot(hand[0], hand[1])).toBeGreaterThan(18.9);
    expect(hand[1]).toBeLessThan(-18.9);
  });

  it("every character's thinking hand reaches its chin", () => {
    for (const art of Object.values(ART)) {
      const angles = armAngles("chin", "right", art.arms, art.anchors.chin);
      const hand = handAt(art.arms.shoulders[1], art.arms.upper, art.arms.fore, angles);
      expect(dist(hand, art.anchors.chin)).toBeLessThan(0.5);
    }
  });

  it("mirrors posed arms left/right", () => {
    const arm = ART.lumi.arms;
    for (const pose of Object.keys(ARM_POSES) as (keyof typeof ARM_POSES)[]) {
      const [l1, l2] = armAngles(pose, "left", arm, [0, 0]);
      const [r1, r2] = armAngles(pose, "right", arm, [0, 0]);
      expect(l1).toBe(-r1);
      expect(l2).toBe(-r2);
    }
  });

  it("applies per-character overrides without touching the shared table", () => {
    const bondNeutral = faceFor("neutral", ART.bond.overrides);
    expect(bondNeutral.mouth).toBe("flat");
    expect(FACES.neutral.mouth).toBe("smile");
    expect(faceFor("happy")).toBe(FACES.happy);
  });

  it("phase is deterministic and in [0, 1)", () => {
    expect(phase("abc")).toBe(phase("abc"));
    for (const k of ["", "a", "lumi:r1", "zzz"]) {
      expect(phase(k)).toBeGreaterThanOrEqual(0);
      expect(phase(k)).toBeLessThan(1);
    }
  });
});
