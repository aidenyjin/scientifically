import type { ArtProps, CharacterArt } from "../art";
import { INK, LINE } from "../parts";

/** Watt (id "volt") — a bright bulb who always takes the shortest path. */
const C = { glass: "#f5e3a1", base: "#cfc8ba", blush: "#df9a6c" };

const GLASS =
  "M60 26C77 26 89 39 89 55C89 66 83 73 77 79V88H43V79C37 73 31 66 31 55C31 39 43 26 60 26Z";

function Back({ headwear }: ArtProps) {
  if (headwear) return null;
  return (
    <path
      d="M60 12V18M25 25l4 4M95 25l-4 4M17 50h5M98 50h5"
      stroke={INK}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  );
}

function Body(_: ArtProps) {
  return (
    <>
      <path d={GLASS} fill={C.glass} stroke={INK} strokeWidth={LINE} strokeLinejoin="round" />
      <path d="M53 82Q56.5 75 60 82T67 82" fill="none" stroke={INK} strokeWidth={1.2} opacity={0.45} />
      <rect x={43} y={88} width={34} height={16} rx={4} fill={C.base} stroke={INK} strokeWidth={LINE} />
      <path d="M43 96H77" stroke={INK} strokeWidth={1.3} />
      <path d="M52 104H68L64 110.5H56Z" fill={INK} />
    </>
  );
}

export const volt: CharacterArt = {
  face: {
    eyeY: 56,
    eyeDx: 8,
    rx: 2.7,
    ry: 3.1,
    pupil: 2.7,
    skin: C.glass,
    mouth: { y: 65, w: 10 },
    blush: { color: C.blush, dx: 15, dy: 6.5, rx: 3.8, ry: 2.2 },
    brow: { color: INK, w: 6, gap: 3.5 },
  },
  arms: {
    shoulders: [
      [33, 64],
      [87, 64],
    ],
    upper: 10,
    fore: 10,
    width: 2.2,
    color: INK,
    hand: { r: 2.2, color: INK },
  },
  anchors: {
    top: [60, 26],
    side: [92, 28],
    hat: { x: 60, y: 29, r: -4, s: 0.95 },
    neck: { x: 60, y: 90, s: 0.75 },
    band: 28,
    chin: [70, 72],
  },
  idle: "bob",
  shadow: 18,
  Back,
  Body,
};
