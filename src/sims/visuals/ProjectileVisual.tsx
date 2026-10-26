"use client";

import { useRef } from "react";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, niceCeilFine, short, tickStep } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

const GROUND = 176;
const ORIGIN_X = 52;
const RIGHT_PAD = 26;
const TOP_PAD = 34;

/** A ball launched from a little cannon, tracing its arc, with a range marker. */
export function ProjectileVisual({ params, outputs, goal }: SimVisualProps) {
  const { v0, angle, g } = params;
  const { range, maxHeight, flightTime } = outputs;
  const still = useStaticPose();
  const ball = useRef<SVGGElement>(null);
  const launchedAt = useRef<number | null>(null);
  const lastKey = useRef("");

  // World → pixels: one uniform scale that fits the range (and target) and the apex.
  const rangeGoal = goal?.output === "range" ? goal.target : 0;
  const heightGoal = goal?.output === "maxHeight" ? goal.target : 0;
  const spanX = niceCeilFine(Math.max(range, rangeGoal * 1.15, 5));
  const spanY = Math.max(maxHeight, heightGoal) * 1.08 || 1;
  const s = Math.min((SCENE.w - ORIGIN_X - RIGHT_PAD) / spanX, (GROUND - TOP_PAD) / spanY);
  const visibleX = (SCENE.w - ORIGIN_X - RIGHT_PAD) / s;
  const step = tickStep(visibleX, 6);
  const px = (x: number) => ORIGIN_X + x * s;
  const py = (y: number) => GROUND - y * s;

  const a = (angle * Math.PI) / 180;
  const vx = v0 * Math.cos(a);
  const vy = v0 * Math.sin(a);
  const at = (t: number): [number, number] => [px(vx * t), py(vy * t - 0.5 * g * t * t)];
  const path = Array.from({ length: 49 }, (_, k) => at((flightTime * k) / 48))
    .map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("");

  // Play each flight at real speed, clamped to 1–2.6 s so it's always watchable, then rest briefly.
  const playFor = clamp(flightTime, 1, 2.6);
  useFrame((seconds) => {
    const key = `${v0}:${angle}:${g}`;
    if (key !== lastKey.current || launchedAt.current === null) {
      lastKey.current = key;
      launchedAt.current = seconds;
    }
    const cycle = playFor + 0.9;
    const local = still ? playFor / 2 : (seconds - launchedAt.current) % cycle;
    const t = (Math.min(local, playFor) / playFor) * flightTime;
    const [x, y] = at(t);
    ball.current?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  }, !still);

  const ticks: number[] = [];
  for (let x = step; x <= visibleX + 1e-9; x += step) ticks.push(Number(x.toPrecision(10)));
  const landX = px(range);
  const tolPx = goal?.output === "range" ? goal.tolerance * s : 0;
  const nearFlag = goal?.output === "range" && Math.abs(landX - px(goal.target)) < 44;
  const labelY = nearFlag ? GROUND - 80 : GROUND - 34;
  const labelX = clamp(landX, 34, SCENE.w - 34);

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Ball launched at ${angle}° and ${v0} m/s lands ${short(range)} m away`}>
      {/* ground */}
      <rect x={-400} y={GROUND} width={SCENE.w + 800} height={SCENE.h - GROUND} fill="var(--correct)" opacity={0.18} />
      <line x1={-400} x2={SCENE.w + 400} y1={GROUND} y2={GROUND} stroke="var(--correct)" strokeWidth={3} opacity={0.55} />
      {ticks.map((x, k) => (
        <g key={x}>
          <line x1={px(x)} x2={px(x)} y1={GROUND} y2={GROUND + 6} stroke="var(--correct-dark)" strokeWidth={1.5} opacity={0.5} />
          <text x={px(x)} y={GROUND + 21} textAnchor="middle" className="fill-muted text-[12px] font-bold">
            {short(x)}
            {k === ticks.length - 1 ? " m" : ""}
          </text>
        </g>
      ))}

      {/* target */}
      {goal?.output === "range" && (
        <g>
          <rect x={px(goal.target) - tolPx} y={GROUND - 4} width={Math.max(4, tolPx * 2)} height={8} rx={4} fill="var(--correct)" opacity={0.55} />
          <line x1={px(goal.target)} x2={px(goal.target)} y1={GROUND} y2={GROUND - 46} stroke="var(--ink-soft)" strokeWidth={2.5} strokeLinecap="round" />
          <path d={`M${px(goal.target)} ${GROUND - 46}l22 7l-22 7z`} fill="var(--wrong)" />
        </g>
      )}
      {goal?.output === "maxHeight" && (
        <line x1={ORIGIN_X} x2={SCENE.w - RIGHT_PAD} y1={py(goal.target)} y2={py(goal.target)} stroke="var(--correct)" strokeWidth={2} strokeDasharray="8 6" opacity={0.8} />
      )}

      {/* trajectory */}
      <path d={path} fill="none" stroke="var(--muted)" strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
      {GROUND - py(maxHeight) > 44 && (
        <g>
          <line x1={px(range / 2)} x2={px(range / 2)} y1={py(maxHeight) + 6} y2={GROUND} stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="3 5" />
          <text x={px(range / 2)} y={Math.max(14, py(maxHeight) - 9)} textAnchor="middle" className="fill-muted text-[12px] font-bold">
            {short(maxHeight)} m high
          </text>
        </g>
      )}

      {/* landing marker */}
      <g>
        <circle cx={landX} cy={GROUND} r={5} fill="var(--streak)" />
        <rect x={labelX - 30} y={labelY} width={60} height={22} rx={8} fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={1.5} />
        <text x={labelX} y={labelY + 15.5} textAnchor="middle" className="fill-ink text-[12px] font-bold">
          {short(range)} m
        </text>
      </g>

      {/* launcher */}
      <g transform={`translate(${ORIGIN_X} ${GROUND})`}>
        <path d={`M28 0A28 28 0 0 0 ${(28 * Math.cos(a)).toFixed(1)} ${(-28 * Math.sin(a)).toFixed(1)}`} fill="none" stroke="var(--brand)" strokeWidth={2} opacity={0.6} />
        <g transform={`rotate(${-angle})`}>
          <rect x={-6} y={-9} width={40} height={18} rx={8} fill="var(--ink-soft)" />
          <rect x={26} y={-10} width={10} height={20} rx={4} fill="var(--ink)" />
        </g>
        <circle r={13} fill="var(--brand)" stroke="var(--surface)" strokeWidth={3} />
        <circle r={4} fill="var(--surface)" />
        <text
          x={(52 * Math.cos(a / 2)).toFixed(1)}
          y={(4 - 52 * Math.sin(a / 2)).toFixed(1)}
          // A surface-coloured halo keeps the angle readable where the dotted path crosses it.
          stroke="var(--surface)"
          strokeWidth={4}
          strokeLinejoin="round"
          paintOrder="stroke"
          className="fill-brand text-[12px] font-bold"
        >
          {Math.round(angle)}°
        </text>
      </g>

      {/* ball */}
      <g ref={ball} transform={`translate(${ORIGIN_X} ${GROUND})`}>
        <circle r={9} fill="var(--streak)" stroke="var(--surface)" strokeWidth={2.5} />
        <circle cx={-3} cy={-3} r={2.5} fill="white" opacity={0.6} />
      </g>
    </svg>
  );
}
