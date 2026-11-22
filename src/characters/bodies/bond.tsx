import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Fizz (id "bond") — a flask with a little drama about every reaction. */
const C = { glass: "#fbf8f1", liquid: "#e8c77e", blush: "#d98c6a" };

const FLASK = "M49 28H71V54L93 96C96 102 92 110 85 110H35C28 110 24 102 27 96L49 54Z";
const LIQUID = "M37.8 80H82.2L93 96C96 102 92 110 85 110H35C28 110 24 102 27 96Z";

function Back({ headwear }: ArtProps) {
  if (headwear) return null;
  return (
    <g fill="none" stroke={INK} strokeWidth={1.4}>
      <circle cx={63} cy={19} r={2.6} />
      <circle cx={69} cy={11} r={1.8} />
    </g>
  );
}

function Body(_: ArtProps) {
  return (
    <>
      <path d={FLASK} fill={C.glass} />
      <path d={LIQUID} fill={C.liquid} />
      <path d={FLASK} fill="none" stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M37.8 80H82.2" stroke={INK} strokeWidth={1.5} />
      <path d="M45 28H75" stroke={INK} strokeWidth={LINE} strokeLinecap="round" />
      {/* graduation marks on the glass */}
      <path d="M52 62H56M50 68H55" stroke={INK} strokeWidth={1.2} strokeLinecap="round" opacity={0.45} />
      <circle cx={44} cy={101} r={1.4} fill={INK} opacity={0.25} />
      <circle cx={78} cy={89} r={1} fill={INK} opacity={0.25} />
    </>
  );
}

export const bond: CharacterArt = {
  face: {
    eyeY: 92,
    eyeDx: 7.5,
    rx: 2.6,
    ry: 3,
    pupil: 2.6,
    skin: C.liquid,
    mouth: { y: 100, w: 9.5 },
    blush: { color: C.blush, dx: 14, dy: 6, rx: 3.6, ry: 2.1 },
    brow: { color: INK, w: 5.5, gap: 3.5 },
  },
  arms: {
    shoulders: [
      [31, 88],
      [89, 88],
    ],
    upper: 11,
    fore: 10,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [60, 26],
    side: [92, 32],
    hat: { x: 60, y: 28, r: 0, s: 0.72 },
    neck: { x: 60, y: 57, s: 0.62 },
    band: 30,
    chin: [72, 99],
  },
  idle: "bob",
  shadow: 34,
  Back,
  Body,
};
