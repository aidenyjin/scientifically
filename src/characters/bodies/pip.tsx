import type { ArtProps, CharacterArt } from "../art";
import { ellipsePath, Gloss, Shaded } from "../parts";

/** Pip — a single, very excitable cell: a wobbly blob with a visible nucleus. */
const C = {
  skin: "#62d98f",
  shade: "#3fbd73",
  membrane: "#2ea862",
  inner: "#8fe8b1",
  nucleus: "#9d86ff",
  nucleusShade: "#7a60ee",
  nucleolus: "#5b41d6",
  mito: "#ffb35c",
  mitoLine: "#ec8a2c",
  dot: "#3fbd73",
};

const BLOB =
  "M60 33C73 32 85 38 90 50C94 59 92.5 66 95.5 75C98.5 85 96 97 87 104C79 110 67 110.5 58 110.5C46 110.5 34 108.5 27 100.5C21 93 22 83 25 75C28 67 25.5 59 29.5 51C34.5 40 47 33.5 60 33Z";

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-blob`} d={BLOB} fill={C.skin} shade={C.shade} dx={-2.5} dy={-3.5} />
      <path d={BLOB} fill="none" stroke={C.membrane} strokeWidth={2.2} />
      <Gloss cx={40} cy={47} rx={8} ry={4.6} r={-38} opacity={0.5} />
      {/* nucleus */}
      <Shaded id={`${uid}-nuc`} d={ellipsePath(74, 49, 9.5, 9)} fill={C.nucleus} shade={C.nucleusShade} dx={-1.5} dy={-2} />
      <circle cx={76} cy={50.5} r={3.3} fill={C.nucleolus} />
      <ellipse cx={70.5} cy={45} rx={2.6} ry={1.6} fill="#fff" opacity={0.55} transform="rotate(-30 70.5 45)" />
      {/* organelles */}
      <g transform="rotate(-24 41 99)">
        <rect x={35.5} y={96.2} width={11} height={5.6} rx={2.8} fill={C.mito} />
        <path d="M37.5 99Q39 97.6 40.4 99T43.2 99T45 99" fill="none" stroke={C.mitoLine} strokeWidth={1} strokeLinecap="round" />
      </g>
      {[
        [86, 91, 1.4],
        [89, 85, 1],
        [82, 97, 1],
        [50, 41, 1.2],
        [45, 45.5, 0.9],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={C.dot} />
      ))}
    </>
  );
}

export const pip: CharacterArt = {
  face: {
    eyeY: 72,
    eyeDx: 12,
    rx: 7.4,
    ry: 8.4,
    pupil: 5.8,
    skin: C.skin,
    mouth: { y: 86, w: 14 },
    blush: { color: "#ff6f96", dx: 21, dy: 9, rx: 4.8, ry: 3 },
    brow: { color: "#1f8a4c", w: 7, gap: 3 },
  },
  arms: {
    shoulders: [
      [29, 86],
      [91, 86],
    ],
    upper: 8,
    fore: 8,
    width: 8.5,
    color: C.skin,
    outline: C.membrane,
    hand: { r: 5.2, color: C.skin, outline: C.membrane },
  },
  anchors: {
    top: [60, 33],
    side: [93, 34],
    hat: { x: 55, y: 35, r: -8, s: 1 },
    neck: { x: 60, y: 99, s: 0.9 },
    band: 34,
    chin: [77.5, 92.5],
  },
  idle: "jelly",
  Body,
};
