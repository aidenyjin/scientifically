import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Orbi (id "nova") — a small ringed planet who thinks in light-years. */
const C = { skin: "#2d4a7a", crater: "#3d5f95", face: "#faf9f7", blush: "#e3a0ae" };

function Back({ headwear }: ArtProps) {
  return (
    <>
      <path d="M14 88C18 72 100 66 106 78" fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      {!headwear && (
        <path d="M22 34V44M17 39H27" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      )}
      <circle cx={98} cy={46} r={1.4} fill={INK} opacity={0.5} />
    </>
  );
}

function Body(_: ArtProps) {
  return (
    <>
      <circle cx={60} cy={80} r={30} fill={C.skin} stroke={INK} strokeWidth={LINE} />
      <circle cx={46} cy={64} r={5} fill={C.crater} />
      <circle cx={76} cy={100} r={3} fill={C.crater} />
      <circle cx={79} cy={63} r={2} fill={C.crater} />
    </>
  );
}

/** The near half of the ring passes in front of the planet. */
function Front(_: ArtProps) {
  return <path d="M14 88C14 106 102 100 106 78" fill="none" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />;
}

export const nova: CharacterArt = {
  face: {
    eyeY: 80,
    eyeDx: 8,
    rx: 2.7,
    ry: 3.1,
    pupil: 2.7,
    skin: C.skin,
    ink: C.face,
    mouth: { y: 88.5, w: 10 },
    blush: { color: C.blush, dx: 15, dy: 6.5, rx: 3.8, ry: 2.2 },
    brow: { color: C.face, w: 6, gap: 3.5 },
  },
  arms: {
    shoulders: [
      [31, 84],
      [89, 84],
    ],
    upper: 11,
    fore: 10,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [60, 50],
    side: [94, 50],
    hat: { x: 60, y: 52, r: -6, s: 0.9 },
    neck: { x: 60, y: 109, s: 0.7 },
    band: 30,
    chin: [72, 94],
  },
  // Dreamy: even at rest, Orbi's gaze drifts up.
  overrides: { neutral: { look: [0.15, -0.4] } },
  idle: "float",
  shadow: 24,
  Back,
  Body,
  Front,
};
