import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Strata (id "terra") — a calm rock with a fossil inside, thinking in millions of years. */
const C = { skin: "#d9cfc1", blush: "#cf9a85" };

const ROCK =
  "M27 103C21 81 33 56 55 50C79 44 98 63 97 87C96 102 87 110 71 110H41C33 110 29 108 27 103Z";

function Body(_: ArtProps) {
  return (
    <>
      <path d={ROCK} fill={C.skin} stroke={INK} strokeWidth={LINE} />
      <path
        d="M30 93C45 89 60 97 95 90M35 103C52 99 66 106 90 102"
        fill="none"
        stroke={INK}
        strokeWidth={1.3}
        strokeOpacity={0.4}
        strokeLinecap="round"
      />
      <path
        d="M82 66a5 5 0 1 1 -5 5a3 3 0 1 1 3 3"
        fill="none"
        stroke={INK}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </>
  );
}

export const terra: CharacterArt = {
  face: {
    cx: 55,
    eyeY: 74,
    eyeDx: 7.5,
    rx: 2.6,
    ry: 3,
    pupil: 2.6,
    skin: C.skin,
    mouth: { y: 82, w: 9.5 },
    blush: { color: C.blush, dx: 14, dy: 6, rx: 3.6, ry: 2.1 },
    brow: { color: INK, w: 5.5, gap: 3.5 },
  },
  arms: {
    shoulders: [
      [25, 90],
      [96, 88],
    ],
    upper: 12,
    fore: 11,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [58, 47],
    side: [94, 50],
    hat: { x: 58, y: 50, r: -6, s: 1 },
    neck: { x: 60, y: 104, s: 0.8 },
    band: 34,
    chin: [75, 84],
  },
  // Calm: a slower, smaller smile at rest.
  overrides: { neutral: { mouth: "flat", lowerLid: 0.15 } },
  idle: "bob",
  shadow: 36,
  Body,
};
