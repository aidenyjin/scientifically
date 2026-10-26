import type { ArtProps, CharacterArt } from "../art";
import { ellipsePath, Gloss, Shaded } from "../parts";

/** Lumi — the mascot: a pink axolotl with frilly gills in a tiny lab coat. */
const C = {
  skin: "#ffa6d0",
  shade: "#f283b8",
  gill: "#ff6fae",
  gillShade: "#e8508f",
  frill: "#ff94c4",
  coat: "#ffffff",
  coatShade: "#e3e1ef",
  coatLine: "#cfcbe0",
  pen: "#6c5ce7",
};

type Branch = readonly [rootX: number, rootY: number, tipX: number, tipY: number];
const GILLS: readonly Branch[] = [
  [34, 40, 20.5, 29.5],
  [31, 50, 14.5, 48.5],
  [33.5, 60, 20, 69.5],
];

function GillBranch({ b }: { b: Branch }) {
  const [x1, y1, x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  // unit perpendicular, for the little frills on either side of the stalk
  const px = -dy / len;
  const py = dx / len;
  const at = (t: number, off: number): [number, number] => [x1 + dx * t + px * off, y1 + dy * t + py * off];
  const frills = [
    at(0.5, 3.3),
    at(0.5, -3.3),
    at(0.8, 3),
    at(0.8, -3),
  ];
  return (
    <g>
      {frills.map(([fx, fy], i) => (
        <circle key={i} cx={fx} cy={fy} r={2.7} fill={C.frill} />
      ))}
      <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={C.gill} strokeWidth={6.4} strokeLinecap="round" />
      <path
        d={`M${x1 + dx * 0.25} ${y1 + dy * 0.25}L${x2 - dx * 0.08} ${y2 - dy * 0.08}`}
        stroke={C.gillShade}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.55}
      />
    </g>
  );
}

function Back({ uid, animated }: ArtProps) {
  return (
    <>
      {/* tail, peeking out behind the coat */}
      <Shaded
        id={`${uid}-tail`}
        d="M77 97C91 101 102 95 106.5 82.5C108 78.5 105.5 77 103.5 80C98.5 87.5 90 90.5 79 89.5Z"
        fill={C.skin}
        shade={C.shade}
        dx={-1}
        dy={-2}
      />
      {/* gills, swaying gently from their roots */}
      <g className={animated ? "ch-sway" : undefined} style={{ transformOrigin: "33px 50px" }}>
        {GILLS.map((b, i) => (
          <GillBranch key={i} b={b} />
        ))}
      </g>
      <g
        className={animated ? "ch-sway" : undefined}
        style={{ transformOrigin: "87px 50px", animationDirection: "reverse" }}
      >
        {GILLS.map(([x1, y1, x2, y2], i) => (
          <GillBranch key={i} b={[120 - x1, y1, 120 - x2, y2]} />
        ))}
      </g>
      {/* feet */}
      <ellipse cx={48.5} cy={110} rx={6.8} ry={3.6} fill={C.shade} />
      <ellipse cx={71.5} cy={110} rx={6.8} ry={3.6} fill={C.shade} />
    </>
  );
}

const COAT = "M39 84C39 76 47 71 60 71C73 71 81 76 81 84L84 103C84.5 107.5 81 110 76 110H44C39 110 35.5 107.5 36 103Z";

function Body({ uid }: ArtProps) {
  return (
    <>
      <Shaded id={`${uid}-coat`} d={COAT} fill={C.coat} shade={C.coatShade} dx={-3} dy={-2} />
      <path d={COAT} fill="none" stroke={C.coatLine} strokeWidth={1.4} />
      {/* V-neck */}
      <path d="M50.5 72L60 88L69.5 72Z" fill={C.skin} />
      <path d="M49.5 72.5L60 89L70.5 72.5" fill="none" stroke={C.coatLine} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={60} cy={96} r={1.6} fill={C.coatLine} />
      <circle cx={60} cy={103} r={1.6} fill={C.coatLine} />
      {/* pocket with a pen */}
      <rect x={45.2} y={84.5} width={2.8} height={8} rx={1.4} fill={C.pen} />
      <path d="M42.5 90.5H52.5V96.5C52.5 98 51.5 99 50 99H45C43.5 99 42.5 98 42.5 96.5Z" fill={C.coat} stroke={C.coatLine} strokeWidth={1.4} />
      {/* head */}
      <Shaded id={`${uid}-head`} d={ellipsePath(60, 50, 31, 25.5)} fill={C.skin} shade={C.shade} dx={-2} dy={-3.5} />
      <Gloss cx={46} cy={35.5} rx={9} ry={4.4} r={-22} opacity={0.5} />
      <circle cx={63} cy={30.5} r={1.5} fill={C.shade} opacity={0.6} />
      <circle cx={69} cy={32.5} r={1.1} fill={C.shade} opacity={0.6} />
      <circle cx={57.5} cy={29.5} r={1} fill={C.shade} opacity={0.6} />
    </>
  );
}

export const lumi: CharacterArt = {
  face: {
    eyeY: 50,
    eyeDx: 13.5,
    rx: 7,
    ry: 7.8,
    pupil: 5.3,
    skin: C.skin,
    mouth: { y: 63, w: 15 },
    mouthScale: { smile: 1.25 },
    blush: { color: "#ff6fa6", dx: 22, dy: 9, rx: 5.2, ry: 3.2, base: 0.7 },
    brow: { color: "#d8548f", w: 7.5, gap: 3.2 },
  },
  arms: {
    shoulders: [
      [41.5, 79],
      [78.5, 79],
    ],
    upper: 10,
    fore: 9.5,
    width: 7,
    color: C.coat,
    outline: C.coatLine,
    hand: { r: 4, color: C.skin, outline: C.shade },
  },
  anchors: {
    top: [60, 24],
    side: [93, 22],
    hat: { x: 60, y: 26.5, r: -8, s: 1 },
    neck: { x: 60, y: 76, s: 1 },
    band: 31,
    chin: [68, 70],
  },
  Back,
  Body,
};
