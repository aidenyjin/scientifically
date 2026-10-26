"use client";

import { useRef } from "react";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, short } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

const PIVOT_X = 280;
const PIVOT_Y = 24;
const PX_PER_M = 54;
const AMPLITUDE = 20; // degrees
/** Shown in slow motion, but in proportion: every period is stretched by the same factor. */
const SLOW_MOTION = 2;

/** A pendulum swinging with its true period (in ½× slow motion). */
export function PendulumVisual({ params, outputs }: SimVisualProps) {
  const { length } = params;
  const { period } = outputs;
  const still = useStaticPose();
  const arm = useRef<SVGGElement>(null);

  const lengthPx = clamp(length * PX_PER_M, 22, 166);
  const phase = useRef(0);

  useFrame((_, dt) => {
    // Integrate phase so changing the length mid-swing doesn't jump.
    phase.current += (dt / (period * SLOW_MOTION)) * Math.PI * 2;
    const theta = still ? AMPLITUDE * 0.8 : AMPLITUDE * Math.cos(phase.current);
    arm.current?.setAttribute("transform", `rotate(${theta.toFixed(2)} ${PIVOT_X} ${PIVOT_Y})`);
  }, !still);

  const arcR = lengthPx;
  const a = (AMPLITUDE * Math.PI) / 180;
  const arcFrom = [PIVOT_X - arcR * Math.sin(a), PIVOT_Y + arcR * Math.cos(a)];
  const arcTo = [PIVOT_X + arcR * Math.sin(a), PIVOT_Y + arcR * Math.cos(a)];
  const rulerX = 130;
  const marks = [0.5, 1, 1.5, 2, 2.5, 3].filter((m) => m * PX_PER_M <= 166);

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full" role="img" aria-label={`Pendulum ${short(length)} m long, period ${short(period)} s`}>
      {/* ruler */}
      <line x1={rulerX} x2={rulerX} y1={PIVOT_Y} y2={PIVOT_Y + 166} stroke="var(--line-strong)" strokeWidth={2} />
      {marks.map((m) => (
        <g key={m}>
          <line x1={rulerX - (m % 1 ? 4 : 8)} x2={rulerX} y1={PIVOT_Y + m * PX_PER_M} y2={PIVOT_Y + m * PX_PER_M} stroke="var(--line-strong)" strokeWidth={2} />
          {m % 1 === 0 && (
            <text x={rulerX - 12} y={PIVOT_Y + m * PX_PER_M + 4} textAnchor="end" className="fill-muted text-[12px] font-bold">
              {m} m
            </text>
          )}
        </g>
      ))}
      <line x1={rulerX + 6} x2={PIVOT_X - 30} y1={PIVOT_Y + lengthPx} y2={PIVOT_Y + lengthPx} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.6} />

      {/* swing extent */}
      <path
        d={`M${arcFrom[0].toFixed(1)} ${arcFrom[1].toFixed(1)}A${arcR} ${arcR} 0 0 0 ${arcTo[0].toFixed(1)} ${arcTo[1].toFixed(1)}`}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth={2}
        strokeDasharray="4 6"
      />

      {/* mount */}
      <rect x={PIVOT_X - 60} y={PIVOT_Y - 14} width={120} height={10} rx={5} fill="var(--ink-soft)" />

      <g ref={arm} transform={`rotate(${AMPLITUDE * 0.8} ${PIVOT_X} ${PIVOT_Y})`}>
        <line x1={PIVOT_X} x2={PIVOT_X} y1={PIVOT_Y} y2={PIVOT_Y + lengthPx} stroke="var(--ink)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={PIVOT_X} cy={PIVOT_Y + lengthPx} r={15} fill="var(--brand)" stroke="var(--surface)" strokeWidth={3} />
        <circle cx={PIVOT_X - 5} cy={PIVOT_Y + lengthPx - 5} r={4} fill="white" opacity={0.5} />
      </g>
      <circle cx={PIVOT_X} cy={PIVOT_Y} r={5} fill="var(--ink)" />

      <g transform={`translate(${SCENE.w - 20} 26)`}>
        <text textAnchor="end" className="fill-muted text-[12px] font-bold">
          {still ? "Swing paused (reduced motion)" : "Slow motion ×½"}
        </text>
        <text y={22} textAnchor="end" className="fill-ink text-[15px] font-bold">
          T = {short(period)} s
        </text>
      </g>
    </svg>
  );
}
