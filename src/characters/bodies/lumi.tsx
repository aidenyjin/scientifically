import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Lumi (id "lumi") — a magnifying glass, the lab guide who notices everything. */
const C = { lens: "#e6eef5", handle: "#c58d4f", collar: "#cfc8ba", blush: "#dd9a95" };

function Body(_: ArtProps) {
  return (
    <>
      {/* handle and collar first, so the lens sits on top */}
      <rect x={54} y={84} width={10} height={26} rx={3.5} fill={C.handle} stroke={INK} strokeWidth={LINE} />
      <path d="M56.5 92V104" stroke={INK} strokeWidth={1.2} strokeLinecap="round" opacity={0.35} />
      <rect x={51.5} y={81} width={15} height={6} rx={2} fill={C.collar} stroke={INK} strokeWidth={LINE} />
      <circle cx={59} cy={54} r={28} fill={C.lens} stroke={INK} strokeWidth={LINE + 1} />
      <circle cx={59} cy={54} r={23.5} fill="none" stroke={INK} strokeWidth={1} opacity={0.3} />
      {/* the glint */}
      <path d="M40 43A22 22 0 0 1 49 33.5" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
    </>
  );
}

export const lumi: CharacterArt = {
  face: {
    cx: 59,
    eyeY: 55,
    eyeDx: 8,
    rx: 2.7,
    ry: 3.1,
    pupil: 2.7,
    skin: C.lens,
    mouth: { y: 64, w: 10 },
    blush: { color: C.blush, dx: 15, dy: 6.5, rx: 3.8, ry: 2.2 },
    brow: { color: INK, w: 6, gap: 3.5 },
  },
  arms: {
    shoulders: [
      [32, 62],
      [86, 62],
    ],
    upper: 11,
    fore: 11,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [59, 26],
    side: [90, 28],
    hat: { x: 59, y: 28, r: -6, s: 0.9 },
    neck: { x: 59, y: 84, s: 0.6 },
    band: 30,
    chin: [68, 70],
  },
  idle: "bob",
  shadow: 16,
  Body,
};
