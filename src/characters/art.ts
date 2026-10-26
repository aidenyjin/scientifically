import type { ComponentType } from "react";
import type { ArmGeometry, FaceOverrides, FaceState, MouthKind, Pt } from "./rig";
import type { Expression } from "./types";

/** Where a character's face sits, in the 120×120 viewBox. */
export interface FaceSpec {
  eyeY: number;
  /** Half the distance between the eyes. */
  eyeDx: number;
  cx?: number;
  rx: number;
  ry: number;
  pupil: number;
  /** Colour of the skin around the eyes (eyelids are drawn in it). */
  skin: string;
  mouth: { y: number; w: number; x?: number };
  blush: { color: string; dx: number; dy: number; rx: number; ry: number; base?: number };
  brow: { color: string; w: number; gap: number };
  /** Per-expression mouth width multipliers. */
  mouthScale?: Partial<Record<MouthKind, number>>;
}

export interface ArmSpec extends ArmGeometry {
  width: number;
  color: string;
  /** A darker rim under the stroke so the arm reads over the body. */
  outline?: string;
  hand: { r: number; color: string; outline?: string };
  style?: "plain" | "zig";
}

export interface Anchors {
  /** Top-centre of the head (surprise burst). */
  top: Pt;
  /** Empty space up and to the right of the head (zzz, thought bubble). */
  side: Pt;
  /** Where hats sit: base centre, rotation (deg) and scale. */
  hat: { x: number; y: number; r: number; s: number };
  neck: { x: number; y: number; s: number };
  /** Half-width of the head at eye level (goggle strap). */
  band: number;
  /** Where the thinking hand rests. */
  chin: Pt;
}

export interface ArtProps {
  uid: string;
  face: FaceState;
  expression: Expression;
  animated: boolean;
  /** True when a head cosmetic is worn (hide built-in hats). */
  headwear: boolean;
}

export interface CharacterArt {
  face: FaceSpec;
  arms: ArmSpec;
  anchors: Anchors;
  overrides?: FaceOverrides;
  /** Idle loop style. */
  idle?: "bob" | "jelly" | "float";
  /** Ground-shadow half-width. */
  shadow?: number;
  /** Drawn first (tails, gills, antennae). */
  Back?: ComponentType<ArtProps>;
  Body: ComponentType<ArtProps>;
  /** Drawn over the face (hats, coat details). */
  Front?: ComponentType<ArtProps>;
}
