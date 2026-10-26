import type { ArtProps, CharacterArt } from "../art";
import { Gloss, Shaded } from "../parts";

/** Volt — a hovering spark of pure energy with a lightning-bolt crest. */
const C = {
  skin: "#ffd23f",
  shade: "#f5ab1f",
  bolt: "#ff9f1c",
  boltShade: "#ee7d00",
  arm: "#f29a0c",
};

type P = [number, number];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const f = (p: P) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/** A soft spark: rounded tips, gently rounded valleys. */
function sparkPath(cx: number, cy: number, outer: number, inner: number, n: number, rot: number): string {
  const pt = (deg: number, r: number): P => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const tips = Array.from({ length: n }, (_, i) => pt(rot + (i * 360) / n, outer));
  const vals = Array.from({ length: n }, (_, i) => pt(rot + (i * 360) / n + 180 / n, inner));
  let d = `M${f(lerp(vals[n - 1], tips[0], 0.2))}`;
  for (let i = 0; i < n; i++) {
    const t = tips[i];
    const v = vals[i];
    const next = tips[(i + 1) % n];
    const prev = vals[(i + n - 1) % n];
    d += `L${f(lerp(prev, t, 0.62))}Q${f(t)} ${f(lerp(t, v, 0.38))}`;
    d += `L${f(lerp(t, v, 0.8))}Q${f(v)} ${f(lerp(v, next, 0.2))}`;
  }
  return `${d}Z`;
}

const SPARK = sparkPath(60, 60, 35, 27.5, 9, -90 + 180 / 9);
const BOLT = "M65 4.5L49.5 25.5H58.5L53.5 41L71.5 18.5H62.5L68.5 4.5Z";

function Back({ animated }: ArtProps) {
  return (
    <g className={animated ? "ch-flicker" : undefined}>
      <path d="M17 44l5 3-2 3 5 3" fill="none" stroke={C.bolt} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M101 74l4 2.5-2.5 2 4.5 3" fill="none" stroke={C.bolt} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-spark`} d={SPARK} fill={C.skin} shade={C.shade} dx={-2.5} dy={-4} />
      <Gloss cx={45} cy={41} rx={8.5} ry={4.5} r={-35} opacity={0.6} />
    </>
  );
}

function Front({ uid, headwear }: ArtProps) {
  if (headwear) return null;
  return (
    <g transform="rotate(8 60 30)">
      <Shaded id={`${uid}-bolt`} d={BOLT} fill={C.bolt} shade={C.boltShade} dx={-1} dy={-1.5} />
      <path d={BOLT} fill="none" stroke={C.boltShade} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

export const volt: CharacterArt = {
  face: {
    eyeY: 58,
    eyeDx: 12,
    rx: 7.2,
    ry: 8,
    pupil: 5.6,
    skin: C.skin,
    mouth: { y: 72, w: 14 },
    blush: { color: "#ff8a3d", dx: 20.5, dy: 9.5, rx: 4.8, ry: 3, base: 0.45 },
    brow: { color: "#d98200", w: 7, gap: 3 },
  },
  arms: {
    shoulders: [
      [31, 67],
      [89, 67],
    ],
    upper: 9,
    fore: 9.5,
    width: 4,
    color: C.arm,
    style: "zig",
    hand: { r: 4, color: C.skin, outline: C.arm },
  },
  anchors: {
    top: [40, 32],
    side: [94, 28],
    hat: { x: 60, y: 29, r: -6, s: 1 },
    neck: { x: 60, y: 87, s: 0.85 },
    band: 33,
    chin: [76, 79],
  },
  idle: "float",
  shadow: 19,
  Back,
  Body,
  Front,
};
