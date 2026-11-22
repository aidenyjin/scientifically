"use client";

/**
 * Shared parts every character is built from: shading, eyes, brows, mouths,
 * blush, arms, ground shadow and the little extras (zzz, sparkles, ...).
 * Expression changes morph via CSS transitions on transform/opacity; parts
 * whose shape changes (mouths, extras) cross-fade.
 */
import { AnimatePresence, motion } from "motion/react";
import type { Anchors, ArmSpec, FaceSpec } from "./art";
import { armAngles, round2, type Extra, type FaceState, type MouthKind, type Pt, type Side } from "./rig";

/** The one line colour the whole cast (and the UI) is drawn with. */
export const INK = "#1c1a17";
const TONGUE = "#c9776a";
/** Outline weight for bodies, in viewBox units. */
export const LINE = 2;

const FADE = { duration: 0.16, ease: [0.23, 1, 0.32, 1] as const };
const FADE_OUT = { duration: 0.1, ease: [0.23, 1, 0.32, 1] as const };

/* ---------------------------------------------------------------- shading */

export function ellipsePath(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
}

/**
 * A flat shape with one shade tone: the shade fills the shape, then the base
 * colour, nudged up-left and clipped to the shape, covers all but a crescent
 * along the bottom-right edge.
 */
export function Shaded({
  id,
  d,
  fill,
  shade,
  dx = -2.5,
  dy = -4,
}: {
  id: string;
  d: string;
  fill: string;
  shade: string;
  dx?: number;
  dy?: number;
}) {
  return (
    <>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={shade} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={fill} transform={`translate(${dx} ${dy})`} />
      </g>
    </>
  );
}

/** A star polygon (draw with a same-colour round-join stroke to soften the points). */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5, rotate = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((rotate + (i * 180) / points) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** The single soft highlight. */
export function Gloss({ cx, cy, rx, ry, r = -24, color = "#ffffff", opacity = 0.55 }: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  r?: number;
  color?: string;
  opacity?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={opacity} transform={`rotate(${r} ${cx} ${cy})`} />;
}

export function GroundShadow({ rx, className, delay }: { rx: number; className?: string; delay?: string }) {
  return (
    <g className={className} style={{ transformOrigin: "60px 112px", animationDelay: delay }}>
      <ellipse cx={60} cy={112} rx={rx} ry={3.4} fill={INK} opacity={0.1} />
    </g>
  );
}

/* ------------------------------------------------------------------- eyes */

const mirror = (side: Side, v: number) => (side === "left" ? -v : v);

/**
 * A dot eye. Lids are skin-coloured shapes clipped to the dot, so the same
 * numbers that drive a big cartoon eye still read on a small one: an upper
 * lid flattens it (sleepy, sad), a lower arch squints it (smiling).
 */
function Eye({
  side,
  spec,
  face,
  clipId,
  blink,
}: {
  side: Side;
  spec: FaceSpec;
  face: FaceState;
  clipId: string;
  blink: boolean;
}) {
  const { rx, ry, skin } = spec;
  const ink = spec.ink ?? INK;
  const x = (spec.cx ?? 60) + mirror(side, spec.eyeDx);
  const open = face.eye === "open";
  const lookX = round2(face.look[0] * rx * 0.55);
  const lookY = round2(face.look[1] * ry * 0.45);
  const lid = round2(face.upperLid * (2 * ry + 1));
  const lower = round2(face.lowerLid * 2 * ry);
  const tilt = mirror(side, face.lidTilt);
  const w = rx + 3;
  const arch = ry * 0.6;
  return (
    <g transform={`translate(${x} ${spec.eyeY})`}>
      <g className="ch-t" style={{ transform: `translate(${lookX}px, ${lookY}px)` }}>
        <clipPath id={clipId}>
          <ellipse rx={rx + 0.4} ry={ry + 0.4} />
        </clipPath>
        <g className="ch-t" style={{ transform: `scale(${face.eyeScale * (0.85 + 0.15 * face.pupilScale)})`, opacity: open ? 1 : 0 }}>
          <g className={blink && open ? "ch-blink" : undefined}>
            <ellipse rx={rx} ry={ry} fill={ink} />
            <g clipPath={`url(#${clipId})`}>
              {/* upper lid: rests above the dot, slides down to close */}
              <g className="ch-t" style={{ transform: `rotate(${tilt}deg) translateY(${lid}px)` }}>
                <rect x={-w} y={-3 * ry - 1} width={w * 2} height={2 * ry} fill={skin} />
              </g>
              {/* lower lid: an upward arch that squints the dot into a smile */}
              <g className="ch-t" style={{ transform: `translateY(${-lower}px)` }}>
                <path
                  d={`M${-w} ${ry + 0.6 + arch / 2}Q0 ${ry + 0.6 - arch / 2} ${w} ${ry + 0.6 + arch / 2}V${3 * ry}H${-w}Z`}
                  fill={skin}
                />
              </g>
            </g>
          </g>
        </g>
      </g>
      <g className="ch-t" style={{ opacity: open ? 0 : 1 }}>
        <path
          d={`M${-rx * 1.3} ${ry * 0.35}Q0 ${-ry * 1.1} ${rx * 1.3} ${ry * 0.35}`}
          fill="none"
          stroke={ink}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

export function Eyes({ spec, face, uid, blink }: { spec: FaceSpec; face: FaceState; uid: string; blink: boolean }) {
  return (
    <>
      <Eye side="left" spec={spec} face={face} clipId={`${uid}-el`} blink={blink} />
      <Eye side="right" spec={spec} face={face} clipId={`${uid}-er`} blink={blink} />
    </>
  );
}

export function Brows({ spec, face }: { spec: FaceSpec; face: FaceState }) {
  const cx = spec.cx ?? 60;
  const y = spec.eyeY - spec.ry - spec.brow.gap;
  const w = spec.brow.w;
  return (
    <>
      {(["left", "right"] as const).map((side, i) => {
        const b = face.brows[i];
        return (
          <g key={side} transform={`translate(${cx + mirror(side, spec.eyeDx)} ${y})`}>
            <g
              className="ch-t"
              style={{ transform: `translateY(${-b.lift}px) rotate(${mirror(side, b.tilt)}deg)`, opacity: face.browOpacity }}
            >
              <path
                d={`M${-w / 2} 0.8Q0 -1.2 ${w / 2} 0.8`}
                fill="none"
                stroke={spec.brow.color}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </g>
          </g>
        );
      })}
    </>
  );
}

export function Blush({ spec, face }: { spec: FaceSpec; face: FaceState }) {
  const { color, dx, dy, rx, ry, base = 0 } = spec.blush;
  const cx = spec.cx ?? 60;
  const opacity = Math.max(base, face.blush) * 0.45;
  return (
    <g className="ch-t" style={{ opacity }}>
      <ellipse cx={cx - dx} cy={spec.eyeY + dy} rx={rx} ry={ry} fill={color} />
      <ellipse cx={cx + dx} cy={spec.eyeY + dy} rx={rx} ry={ry} fill={color} />
    </g>
  );
}

/* ----------------------------------------------------------------- mouths */

function openMouth(w: number, h: number, clipId: string, ink: string) {
  const d = `M${-w / 2} 0Q0 ${w * 0.1} ${w / 2} 0Q${w * 0.44} ${h} 0 ${h}Q${-w * 0.44} ${h} ${-w / 2} 0Z`;
  return (
    <>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={ink} stroke={ink} strokeWidth={1.4} strokeLinejoin="round" />
      <ellipse cy={h * 1.02} rx={w * 0.24} ry={h * 0.38} fill={TONGUE} clipPath={`url(#${clipId})`} />
    </>
  );
}

function MouthShape({ kind, w, clipId, ink }: { kind: MouthKind; w: number; clipId: string; ink: string }) {
  const line = { fill: "none", stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const };
  switch (kind) {
    case "smile":
      return <path d={`M${-w / 2} 0Q0 ${w * 0.42} ${w / 2} 0`} {...line} />;
    case "grin":
      return openMouth(w * 0.9, w * 0.5, clipId, ink);
    case "laugh":
      return openMouth(w, w * 0.7, clipId, ink);
    case "frown":
      return <path d={`M${-w * 0.34} ${w * 0.16}Q0 ${-w * 0.2} ${w * 0.34} ${w * 0.16}`} {...line} />;
    case "hmm":
      return (
        <path d={`M${-w * 0.2} ${w * 0.06}C${-w * 0.02} ${-w * 0.1} ${w * 0.16} ${w * 0.18} ${w * 0.38} ${-w * 0.04}`} {...line} />
      );
    case "o":
      return (
        <>
          <clipPath id={clipId}>
            <ellipse cy={w * 0.06} rx={w * 0.19} ry={w * 0.24} />
          </clipPath>
          <ellipse cy={w * 0.06} rx={w * 0.16} ry={w * 0.2} fill={ink} />
        </>
      );
    case "yawn":
      return <ellipse cy={w * 0.04} rx={w * 0.11} ry={w * 0.09} fill={ink} />;
    case "flat":
      return <path d={`M${-w * 0.26} 0L${w * 0.26} 0`} {...line} />;
    case "smirk":
      return <path d={`M${-w * 0.3} ${w * 0.02}Q${w * 0.08} ${w * 0.2} ${w * 0.34} ${-w * 0.1}`} {...line} />;
  }
}

export function Mouth({ spec, face, uid }: { spec: FaceSpec; face: FaceState; uid: string }) {
  const w = spec.mouth.w * (spec.mouthScale?.[face.mouth] ?? 1);
  return (
    <g transform={`translate(${spec.mouth.x ?? spec.cx ?? 60} ${spec.mouth.y})`}>
      <AnimatePresence initial={false}>
        <motion.g
          key={face.mouth}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: FADE }}
          exit={{ opacity: 0, transition: FADE_OUT }}
        >
          <MouthShape kind={face.mouth} w={w} clipId={`${uid}-m-${face.mouth}`} ink={spec.ink ?? INK} />
        </motion.g>
      </AnimatePresence>
    </g>
  );
}

/* ------------------------------------------------------------------- arms */

function segment(len: number, zig: boolean): string {
  if (!zig) return `M0 0L0 ${len}`;
  return `M0 0L2 ${len * 0.38}L-2 ${len * 0.64}L0 ${len}`;
}

function ArmPass({
  spec,
  angles,
  pass,
}: {
  spec: ArmSpec;
  angles: readonly [number, number];
  pass: "outline" | "fill";
}) {
  const zig = spec.style === "zig";
  const rim = pass === "outline";
  if (rim && !spec.outline && !spec.hand.outline) return null;
  const stroke = rim ? (spec.outline ?? "none") : spec.color;
  const width = rim ? spec.width + 2.6 : spec.width;
  const hand = spec.hand;
  return (
    <g className="ch-t" style={{ transform: `rotate(${angles[0]}deg)` }}>
      <path
        d={segment(spec.upper, zig)}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(0 ${spec.upper})`}>
        <g className="ch-t" style={{ transform: `rotate(${angles[1]}deg)` }}>
          <path
            d={segment(spec.fore, zig)}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cy={spec.fore}
            r={rim ? hand.r + 1.3 : hand.r}
            fill={rim ? (hand.outline ?? spec.outline ?? "none") : hand.color}
          />
        </g>
      </g>
    </g>
  );
}

export function Arms({ spec, face, chin }: { spec: ArmSpec; face: FaceState; chin: Pt }) {
  return (
    <>
      {(["left", "right"] as const).map((side, i) => {
        const angles = armAngles(face.arms[i], side, spec, chin);
        const [sx, sy] = spec.shoulders[i];
        return (
          <g key={side} transform={`translate(${sx} ${sy})`}>
            <ArmPass spec={spec} angles={angles} pass="outline" />
            <ArmPass spec={spec} angles={angles} pass="fill" />
          </g>
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------- extras */

function sparklePath(s: number): string {
  const k = s * 0.22;
  return `M0 ${-s}Q${k} ${-k} ${s} 0Q${k} ${k} 0 ${s}Q${-k} ${k} ${-s} 0Q${-k} ${-k} 0 ${-s}Z`;
}

function Sparkles({ top, animated }: { top: Pt; animated: boolean }) {
  const [tx, ty] = top;
  const items: [number, number, number, string][] = [
    [tx - 38, ty + 10, 6, "#c29a1e"],
    [tx + 36, ty + 2, 5, "#c2453f"],
    [tx - 24, ty - 10, 3.6, "#2d4a7a"],
    [tx + 30, ty + 30, 3.4, "#5f8a5a"],
  ];
  return (
    <>
      {items.map(([x, y, s, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path
            d={sparklePath(s)}
            fill={c}
            className={animated ? "ch-twinkle" : undefined}
            style={animated ? { animationDelay: `${-i * 0.37}s` } : undefined}
          />
        </g>
      ))}
    </>
  );
}

function Thought({ side, animated }: { side: Pt; animated: boolean }) {
  const [sx, sy] = side;
  const cloud: [number, number, number][] = [
    [-6, 1, 5.6],
    [0, -3, 6.6],
    [6.5, 0.5, 5.6],
    [0, 3, 5.4],
  ];
  return (
    <g>
      <circle cx={sx - 9} cy={sy + 13} r={1.9} style={{ fill: "var(--surface)", stroke: "var(--line-strong)" }} strokeWidth={1.4} />
      <circle cx={sx - 4.5} cy={sy + 7.5} r={2.8} style={{ fill: "var(--surface)", stroke: "var(--line-strong)" }} strokeWidth={1.4} />
      <g transform={`translate(${sx + 6} ${sy - 4})`}>
        {cloud.map(([x, y, r], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={r + 1.4} style={{ fill: "var(--line-strong)" }} />
        ))}
        {cloud.map(([x, y, r], i) => (
          <circle key={`f${i}`} cx={x} cy={y} r={r} style={{ fill: "var(--surface)" }} />
        ))}
        {[-4, 0, 4].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={0}
            r={1.35}
            style={{ fill: "var(--muted)", animationDelay: animated ? `${i * 0.2}s` : undefined }}
            className={animated ? "ch-dot" : undefined}
          />
        ))}
      </g>
    </g>
  );
}

function Burst({ top, color }: { top: Pt; color: string }) {
  const [tx, ty] = top;
  return (
    <g transform={`translate(${tx} ${ty - 3})`}>
      <g className="ch-burst" style={{ transformOrigin: "0 0" }}>
        {[-48, 0, 48].map((a) => {
          const r = (a * Math.PI) / 180;
          const s = Math.sin(r);
          const c = Math.cos(r);
          const at = (k: number) => [round2(s * k), round2(-c * k)];
          const [x1, y1] = at(5);
          const [x2, y2] = at(11);
          return (
            <line
              key={a}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </g>
  );
}

function Zzz({ side, animated }: { side: Pt; animated: boolean }) {
  const [sx, sy] = side;
  const zs: [number, number, number][] = [
    [sx - 5, sy + 8, 4.6],
    [sx + 2, sy - 1, 6],
    [sx + 10, sy - 11, 7.6],
  ];
  return (
    <>
      {zs.map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path
            d={`M${-s / 2} ${-s / 2}H${s / 2}L${-s / 2} ${s / 2}H${s / 2}`}
            fill="none"
            stroke="#2d4a7a"
            strokeWidth={Math.max(1.4, s * 0.22)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? "ch-z" : undefined}
            style={animated ? { animationDelay: `${i * 0.9 - 2.7}s` } : { opacity: 0.45 + i * 0.27 }}
          />
        </g>
      ))}
    </>
  );
}

export function Extras({
  extra,
  anchors,
  accent,
  animated,
}: {
  extra: Extra | null;
  anchors: Anchors;
  accent: string;
  animated: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {extra && (
        <motion.g
          key={extra}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: FADE }}
          exit={{ opacity: 0, transition: FADE_OUT }}
        >
          {extra === "sparkles" && <Sparkles top={anchors.top} animated={animated} />}
          {extra === "thought" && <Thought side={anchors.side} animated={animated} />}
          {extra === "pop" && <Burst top={anchors.top} color={accent} />}
          {extra === "zzz" && <Zzz side={anchors.side} animated={animated} />}
        </motion.g>
      )}
    </AnimatePresence>
  );
}
