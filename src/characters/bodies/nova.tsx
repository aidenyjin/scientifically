import type { ArtProps, CharacterArt } from "../art";
import { ellipsePath, Gloss, Shaded, starPath } from "../parts";

/** Nova — a dreamy little purple alien astronaut with a star on her antenna. */
const C = {
  skin: "#9182ff",
  shade: "#7060f0",
  ear: "#b9afff",
  suit: "#4134b8",
  suitShade: "#2f2591",
  suitArm: "#5a4bd8",
  collar: "#ddd8ff",
  collarShade: "#b8aef5",
  star: "#ffd84d",
  starShade: "#f2b62e",
  freckle: "#cfc8ff",
};

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <path d={starPath(cx, cy, r, r * 0.5)} fill={C.starShade} stroke={C.starShade} strokeWidth={r * 0.35} strokeLinejoin="round" />
      <path
        d={starPath(cx - r * 0.06, cy - r * 0.1, r * 0.86, r * 0.43)}
        fill={C.star}
        stroke={C.star}
        strokeWidth={r * 0.25}
        strokeLinejoin="round"
      />
    </>
  );
}

function Back({ animated }: ArtProps) {
  return (
    <>
      <g className={animated ? "ch-sway" : undefined} style={{ transformOrigin: "66px 27px" }}>
        <path d="M66 27Q66 15 73.5 9.5" fill="none" stroke={C.shade} strokeWidth={3.2} strokeLinecap="round" />
        <Star cx={74.5} cy={8.5} r={6.6} />
      </g>
      {/* pointy ears */}
      <path d="M35 38Q25.5 33.5 21 30Q20 41.5 33 50Z" fill={C.shade} strokeLinejoin="round" stroke={C.shade} strokeWidth={4} />
      <path d="M85 38Q94.5 33.5 99 30Q100 41.5 87 50Z" fill={C.shade} strokeLinejoin="round" stroke={C.shade} strokeWidth={4} />
      <path d="M32.5 40.5Q27 37.5 24.8 36Q24.8 42 31.5 46.5Z" fill={C.ear} strokeLinejoin="round" stroke={C.ear} strokeWidth={1.5} />
      <path d="M87.5 40.5Q93 37.5 95.2 36Q95.2 42 88.5 46.5Z" fill={C.ear} strokeLinejoin="round" stroke={C.ear} strokeWidth={1.5} />
      {/* boots */}
      <ellipse cx={48.5} cy={109.5} rx={7.2} ry={3.8} fill={C.collarShade} />
      <ellipse cx={71.5} cy={109.5} rx={7.2} ry={3.8} fill={C.collarShade} />
    </>
  );
}

const SUIT = "M41 86C41 77 49 72 60 72C71 72 79 77 79 86L81 102C81.5 107 78 110 73 110H47C42 110 38.5 107 39 102Z";

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-suit`} d={SUIT} fill={C.suit} shade={C.suitShade} dx={-3} dy={-2} />
      <Star cx={60} cy={94} r={4.6} />
      <circle cx={49} cy={100} r={0.9} fill={C.freckle} opacity={0.7} />
      <circle cx={71} cy={88} r={0.9} fill={C.freckle} opacity={0.7} />
      <Shaded id={`${uid}-collar`} d={ellipsePath(60, 75.5, 18.5, 5.2)} fill={C.collar} shade={C.collarShade} dx={0} dy={-1.6} />
      {/* head */}
      <Shaded id={`${uid}-head`} d={ellipsePath(60, 50, 29.5, 26.5)} fill={C.skin} shade={C.shade} dx={-2} dy={-3.5} />
      <Gloss cx={47} cy={34.5} rx={9} ry={4.4} r={-24} opacity={0.42} />
      {/* constellation freckles */}
      {[
        [36.5, 59.5, 1.1],
        [40, 63.5, 0.85],
        [35, 66, 0.8],
        [83.5, 59.5, 1.1],
        [80, 63.5, 0.85],
        [85, 66, 0.8],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={C.freckle} />
      ))}
    </>
  );
}

export const nova: CharacterArt = {
  face: {
    eyeY: 50,
    eyeDx: 12.5,
    rx: 8,
    ry: 9,
    pupil: 6.1,
    skin: C.skin,
    mouth: { y: 64.5, w: 13 },
    blush: { color: "#ff7fc9", dx: 21.5, dy: 10, rx: 4.8, ry: 2.9 },
    brow: { color: "#3b2db5", w: 7.5, gap: 3 },
  },
  arms: {
    shoulders: [
      [43, 82],
      [77, 82],
    ],
    upper: 10,
    fore: 9,
    width: 6.5,
    color: C.suitArm,
    outline: C.suitShade,
    hand: { r: 4, color: C.skin, outline: C.suitShade },
  },
  anchors: {
    top: [47, 26],
    side: [94, 26],
    hat: { x: 51, y: 27, r: -16, s: 0.92 },
    neck: { x: 60, y: 79, s: 0.95 },
    band: 29.5,
    chin: [67, 72],
  },
  overrides: {
    neutral: { look: [0, -0.1] },
  },
  Back,
  Body,
};
