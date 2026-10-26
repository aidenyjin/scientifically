import type { ArtProps, CharacterArt } from "../art";
import { ellipsePath, Gloss, Shaded } from "../parts";

/** Terra — a calm, round rock in a field hat. Thinks in millions of years. */
const C = {
  skin: "#ab988b",
  shade: "#8c796d",
  fleck: "#7e6c61",
  fleckLight: "#ddd2ca",
  moss: "#93c84f",
  mossShade: "#6fa53a",
  hat: "#dcbc7c",
  hatShade: "#c39f5a",
  brim: "#cfae6b",
  brimShade: "#b38f4c",
  band: "#7a5a45",
};

const FLECKS: readonly (readonly [number, number, number, string])[] = [
  [81, 60, 1.5, C.fleck],
  [86, 66, 1, C.fleck],
  [34, 86, 1.3, C.fleck],
  [79, 99, 1.6, C.fleck],
  [72, 54, 1.1, C.fleckLight],
  [30, 76, 1.1, C.fleckLight],
  [88, 88, 1.2, C.fleckLight],
];

const ROCK = "M23 104C18 90 20 74 30 62C38 52 49 46.5 62 46.5C77 46.5 90 54 95 68C100 81 100 96 95 105C84 110.5 36 110.5 23 104Z";

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-rock`} d={ROCK} fill={C.skin} shade={C.shade} dx={-3} dy={-4} />
      <Gloss cx={40} cy={60} rx={9} ry={4.6} r={-38} opacity={0.4} />
      {FLECKS.map(([x, y, r, c], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c} />
      ))}
      {/* a little moss */}
      <circle cx={27.5} cy={101} r={4.2} fill={C.mossShade} />
      <circle cx={33} cy={104} r={3.6} fill={C.moss} />
      <circle cx={24} cy={104.5} r={3.2} fill={C.moss} />
      <circle cx={28.5} cy={100} r={2.6} fill={C.moss} />
    </>
  );
}

function Front({ uid, headwear }: ArtProps) {
  if (headwear) return null;
  return (
    <g transform="rotate(-6 60 46)">
      <Shaded id={`${uid}-brim`} d={ellipsePath(60, 47, 26.5, 5.4)} fill={C.brim} shade={C.brimShade} dx={0} dy={-1.6} />
      <Shaded id={`${uid}-dome`} d="M41 46C41 30.5 49 22.5 60 22.5C71 22.5 79 30.5 79 46Z" fill={C.hat} shade={C.hatShade} dx={-2} dy={-1} />
      <path d="M41.2 40.5H78.8V46H41.2Z" fill={C.band} />
      <circle cx={60} cy={23} r={2.1} fill={C.hatShade} />
      <Gloss cx={52} cy={30.5} rx={4.6} ry={2.6} r={-35} opacity={0.5} />
    </g>
  );
}

export const terra: CharacterArt = {
  face: {
    eyeY: 70,
    eyeDx: 13,
    rx: 6.8,
    ry: 7.2,
    pupil: 5.2,
    skin: C.skin,
    mouth: { y: 84, w: 13 },
    blush: { color: "#e88f7f", dx: 21, dy: 8.5, rx: 4.8, ry: 2.9, base: 0.3 },
    brow: { color: "#6d4c41", w: 7.5, gap: 3 },
  },
  arms: {
    shoulders: [
      [26.5, 87],
      [93.5, 87],
    ],
    upper: 7,
    fore: 7,
    width: 8,
    color: "#9a877b",
    outline: "#7a685d",
    hand: { r: 4.8, color: C.skin, outline: "#7a685d" },
  },
  anchors: {
    top: [60, 21],
    side: [95, 32],
    hat: { x: 60, y: 48.5, r: -4, s: 1.1 },
    neck: { x: 60, y: 94, s: 0.95 },
    band: 36,
    chin: [81, 92],
  },
  // Calm: lids always a little relaxed.
  overrides: {
    neutral: { upperLid: 0.2 },
    happy: { upperLid: 0.12 },
    thinking: { upperLid: 0.24 },
  },
  shadow: 31,
  Body,
  Front,
};
