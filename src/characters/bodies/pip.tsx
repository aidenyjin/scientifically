import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Cyto (id "pip") — a single cell, curious about everything inside you. */
const C = { skin: "#dce7d6", nucleus: "#9db596", mito: "#e7c98e", blush: "#d99a87" };

const BLOB = "M60 33C85 33 100 49 99 72C98 96 82 110 60 110C36 110 21 96 21 71C22 48 36 33 60 33Z";

function Body(_: ArtProps) {
  return (
    <>
      <path d={BLOB} fill={C.skin} stroke={INK} strokeWidth={LINE} />
      <circle cx={78} cy={53} r={8.5} fill={C.nucleus} stroke={INK} strokeWidth={LINE} />
      <circle cx={80.5} cy={55} r={2.4} fill={INK} opacity={0.35} />
      <ellipse
        cx={37}
        cy={93}
        rx={7}
        ry={3.2}
        transform="rotate(-24 37 93)"
        fill={C.mito}
        stroke={INK}
        strokeWidth={1.5}
      />
      <circle cx={84} cy={93} r={1.3} fill={INK} opacity={0.3} />
      <circle cx={88} cy={87} r={0.9} fill={INK} opacity={0.3} />
      <circle cx={44} cy={46} r={1.1} fill={INK} opacity={0.3} />
    </>
  );
}

export const pip: CharacterArt = {
  face: {
    cx: 58.5,
    eyeY: 72,
    eyeDx: 8.5,
    rx: 2.7,
    ry: 3.1,
    pupil: 2.7,
    skin: C.skin,
    mouth: { y: 81, w: 11 },
    blush: { color: C.blush, dx: 16, dy: 7, rx: 4, ry: 2.3 },
    brow: { color: INK, w: 6, gap: 4 },
  },
  arms: {
    shoulders: [
      [23, 82],
      [97, 82],
    ],
    upper: 12,
    fore: 11,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [60, 33],
    side: [96, 36],
    hat: { x: 58, y: 35, r: -4, s: 0.95 },
    neck: { x: 59, y: 101, s: 0.8 },
    band: 38,
    chin: [76, 87],
  },
  idle: "jelly",
  shadow: 30,
  Body,
};
