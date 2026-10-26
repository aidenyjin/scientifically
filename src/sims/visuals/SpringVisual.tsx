"use client";

import { useRef } from "react";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, niceCeil, short, tickStep } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

const CX = 280;
const CEILING = 22;
const NATURAL = 40; // unstretched spring, px
const MAX_STRETCH = 96; // px for the ruler's full scale
const COILS = 9;

function springPath(top: number, bottom: number): string {
  const len = bottom - top;
  const lead = 6;
  const pitch = (len - 2 * lead) / (COILS * 2);
  let d = `M${CX} ${top}v${lead}`;
  for (let k = 0; k < COILS * 2; k++) d += `L${CX + (k % 2 ? -14 : 14)} ${(top + lead + pitch * (k + 0.5)).toFixed(1)}`;
  return `${d}L${CX} ${(bottom - lead).toFixed(1)}V${bottom.toFixed(1)}`;
}

/** A mass hanging from a spring; it bounces gently to its new rest length when things change. */
export function SpringVisual({ params, outputs, goal }: SimVisualProps) {
  const { mass } = params;
  const { force, extension } = outputs;
  const still = useStaticPose();
  const spring = useRef<SVGPathElement>(null);
  const block = useRef<SVGGElement>(null);
  const state = useRef<{ y: number; v: number } | null>(null);

  const goalExt = goal?.output === "extension" ? goal.target : 0;
  const fullScale = niceCeil(Math.max(extension, goalExt * 1.2, 0.01));
  const pxPerM = MAX_STRETCH / fullScale;
  const restY = CEILING + NATURAL + clamp(extension, 0, fullScale) * pxPerM;
  const size = 24 + 22 * Math.sqrt(clamp(mass / 2, 0, 1));

  useFrame((_, dt) => {
    const s = state.current ?? { y: restY, v: 0 };
    if (still || dt === 0) {
      s.y = restY;
      s.v = 0;
    } else {
      // Under-damped spring towards the new rest position.
      const a = -90 * (s.y - restY) - 7 * s.v;
      s.v += a * dt;
      s.y += s.v * dt;
    }
    state.current = s;
    spring.current?.setAttribute("d", springPath(CEILING, s.y));
    block.current?.setAttribute("transform", `translate(0 ${(s.y - restY).toFixed(2)})`);
  }, !still);

  const step = tickStep(fullScale, 5);
  const ticks = Array.from({ length: Math.round(fullScale / step) + 1 }, (_, k) => Number((k * step).toPrecision(10)));
  const rulerX = CX + 92;
  const arrowLen = clamp(16 + force * 3, 18, Math.max(18, Math.min(60, SCENE.h - 8 - (restY + size / 2))));

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full" role="img" aria-label={`Spring stretched ${short(extension)} m by a ${short(mass)} kg mass`}>
      <rect x={CX - 70} y={CEILING - 12} width={140} height={12} rx={4} fill="var(--ink-soft)" />

      {/* ruler, zeroed at the unstretched length */}
      <line x1={rulerX} x2={rulerX} y1={CEILING + NATURAL} y2={CEILING + NATURAL + MAX_STRETCH} stroke="var(--line-strong)" strokeWidth={2} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={rulerX} x2={rulerX + 8} y1={CEILING + NATURAL + t * pxPerM} y2={CEILING + NATURAL + t * pxPerM} stroke="var(--line-strong)" strokeWidth={2} />
          <text x={rulerX + 14} y={CEILING + NATURAL + t * pxPerM + 4} className="fill-muted text-[12px] font-bold">
            {short(t)} m
          </text>
        </g>
      ))}
      <line x1={CX - 60} x2={rulerX} y1={CEILING + NATURAL} y2={CEILING + NATURAL} stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="4 5" />
      <text x={CX - 64} y={CEILING + NATURAL + 4} textAnchor="end" className="fill-muted text-[12px] font-bold">
        unstretched
      </text>
      {goalExt > 0 && (
        <g>
          <line x1={CX - 30} x2={rulerX + 4} y1={CEILING + NATURAL + goalExt * pxPerM} y2={CEILING + NATURAL + goalExt * pxPerM} stroke="var(--correct)" strokeWidth={2} strokeDasharray="7 5" />
          <path d={`M${rulerX + 60} ${CEILING + NATURAL + goalExt * pxPerM}l8 -6v12z`} fill="var(--correct)" />
          <text x={rulerX + 72} y={CEILING + NATURAL + goalExt * pxPerM + 4} className="fill-correct-ink text-[12px] font-bold">
            target
          </text>
        </g>
      )}

      {/* extension bracket */}
      <line x1={rulerX - 10} x2={rulerX - 10} y1={CEILING + NATURAL} y2={restY} stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" className="transition-[y2] duration-200" />

      <path ref={spring} d={springPath(CEILING, restY)} fill="none" stroke="var(--gem)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />

      <g ref={block}>
        <rect x={CX - size / 2} y={restY} width={size} height={size} rx={8} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        <text x={CX + size / 2 + 8} y={restY + size / 2 + 4.5} className="fill-ink text-[13px] font-bold">
          {short(mass)} kg
        </text>
        <line x1={CX - size / 2 - 22} x2={CX - size / 2 - 22} y1={restY + size / 2} y2={restY + size / 2 + arrowLen} stroke="var(--streak)" strokeWidth={4} strokeLinecap="round" />
        <path d={`M${CX - size / 2 - 29} ${restY + size / 2 + arrowLen - 2}l7 10l7 -10z`} fill="var(--streak)" />
        <text x={CX - size / 2 - 34} y={restY + size / 2 + 14} textAnchor="end" className="fill-ink text-[13px] font-bold">
          {short(force)} N
        </text>
      </g>
    </svg>
  );
}
