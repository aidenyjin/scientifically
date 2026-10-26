import type { ArtProps, CharacterArt } from "../art";
import { ellipsePath, Gloss, Shaded } from "../parts";

/** Bond — a small, deadpan molecule: one big atom with a face, two small ones. */
const C = {
  skin: "#ff7a59",
  shade: "#e5573a",
  atom: "#5ab8ff",
  atomShade: "#3794e6",
  stick: "#bdbad1",
  foot: "#d9482c",
};

function Back({ uid }: ArtProps) {
  return (
    <>
      {/* bonds */}
      <path d="M60 68L22 33M60 68L98 33" stroke={C.stick} strokeWidth={6.5} strokeLinecap="round" />
      <Shaded id={`${uid}-a1`} d={ellipsePath(22, 33, 12.5)} fill={C.atom} shade={C.atomShade} dx={-1.5} dy={-2.2} />
      <Shaded id={`${uid}-a2`} d={ellipsePath(98, 33, 12.5)} fill={C.atom} shade={C.atomShade} dx={-1.5} dy={-2.2} />
      <Gloss cx={17} cy={27.5} rx={4} ry={2.4} r={-35} opacity={0.6} />
      <Gloss cx={93} cy={27.5} rx={4} ry={2.4} r={-35} opacity={0.6} />
      {/* legs */}
      <path d="M50.5 94L48.5 106M69.5 94L71.5 106" stroke={C.stick} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={47.5} cy={108.6} rx={6.2} ry={3.6} fill={C.foot} />
      <ellipse cx={72.5} cy={108.6} rx={6.2} ry={3.6} fill={C.foot} />
    </>
  );
}

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-main`} d={ellipsePath(60, 68, 30)} fill={C.skin} shade={C.shade} dx={-2.5} dy={-4} />
      <Gloss cx={46} cy={51} rx={8.5} ry={4.6} r={-35} opacity={0.5} />
    </>
  );
}

export const bond: CharacterArt = {
  face: {
    eyeY: 64,
    eyeDx: 11.5,
    rx: 6.8,
    ry: 7.4,
    pupil: 5.2,
    skin: C.skin,
    mouth: { y: 79.5, w: 13 },
    blush: { color: "#ff4d6d", dx: 19.5, dy: 9.5, rx: 4.6, ry: 2.8 },
    brow: { color: "#b8401f", w: 7, gap: 3 },
  },
  arms: {
    shoulders: [
      [32.5, 76],
      [87.5, 76],
    ],
    upper: 9.5,
    fore: 8.5,
    width: 3.6,
    color: C.stick,
    hand: { r: 4.8, color: C.skin, outline: C.foot },
  },
  anchors: {
    top: [60, 38],
    side: [76, 20],
    hat: { x: 60, y: 39.5, r: 0, s: 0.95 },
    neck: { x: 60, y: 93, s: 0.9 },
    band: 29.5,
    chin: [74, 86],
  },
  // Deadpan: heavy lids, flat mouth, and only a smirk when pleased.
  overrides: {
    neutral: { upperLid: 0.36, mouth: "flat" },
    happy: { upperLid: 0.2, lowerLid: 0.28, mouth: "smirk" },
    thinking: { upperLid: 0.32, mouth: "flat" },
    celebrate: { mouth: "grin" },
    sleepy: { upperLid: 0.66 },
  },
  Back,
  Body,
};
