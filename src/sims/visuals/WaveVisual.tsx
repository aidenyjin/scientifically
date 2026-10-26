"use client";

import { useId, useRef } from "react";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, short } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

const LEFT = 40;
const RIGHT = 528;
const MID = 90;
const AMP = 40;
const PX_PER_M = 96;
/** Real waves at up to 20 Hz would strobe: show them at ¼ speed (same for every setting). */
const SLOW_MOTION = 4;
const BUOY_X = 300;

/** A travelling sine wave with a wavelength marker and a bobbing buoy. */
export function WaveVisual({ params, outputs }: SimVisualProps) {
  const { frequency, wavelength } = params;
  const { speed } = outputs;
  const still = useStaticPose();
  const clip = useId();
  const wave = useRef<SVGPathElement>(null);
  const buoy = useRef<SVGGElement>(null);
  const travelled = useRef(0);

  const lambdaPx = Math.max(4, wavelength * PX_PER_M);
  // Path from x = LEFT - λ to RIGHT, shifted right by (distance mod λ) each frame.
  const samples = Math.ceil((RIGHT - LEFT + lambdaPx) / Math.min(4, lambdaPx / 8));
  let d = "";
  for (let k = 0; k <= samples; k++) {
    const x = LEFT - lambdaPx + ((RIGHT - LEFT + lambdaPx) * k) / samples;
    const y = MID - AMP * Math.sin((2 * Math.PI * (x - LEFT)) / lambdaPx);
    d += `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }

  useFrame((_, dt) => {
    travelled.current += ((speed * PX_PER_M) / SLOW_MOTION) * dt;
    const shift = travelled.current % lambdaPx;
    wave.current?.setAttribute("transform", `translate(${shift.toFixed(2)} 0)`);
    const y = MID - AMP * Math.sin((2 * Math.PI * (BUOY_X - LEFT - shift)) / lambdaPx);
    buoy.current?.setAttribute("transform", `translate(${BUOY_X} ${y.toFixed(1)})`);
  }, !still);

  const bracketW = clamp(lambdaPx, 4, RIGHT - LEFT - 20);
  const bracketY = MID + AMP + 20;
  const meters = Array.from({ length: Math.floor((RIGHT - LEFT) / PX_PER_M) + 1 }, (_, k) => k);
  const staticBuoyY = MID - AMP * Math.sin((2 * Math.PI * (BUOY_X - LEFT)) / lambdaPx);

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full" role="img" aria-label={`Wave at ${short(frequency)} Hz with wavelength ${short(wavelength)} m travels at ${short(speed)} m/s`}>
      <defs>
        <clipPath id={clip}>
          <rect x={LEFT} y={0} width={RIGHT - LEFT} height={SCENE.h} />
        </clipPath>
      </defs>
      <line x1={LEFT} x2={RIGHT} y1={MID} y2={MID} stroke="var(--line-strong)" strokeWidth={1.5} strokeDasharray="4 6" />
      <g clipPath={`url(#${clip})`}>
        <path ref={wave} d={d} fill="none" stroke="var(--gem)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g ref={buoy} transform={`translate(${BUOY_X} ${staticBuoyY.toFixed(1)})`}>
        <circle r={9} fill="var(--streak)" stroke="var(--surface)" strokeWidth={3} />
      </g>

      {/* wavelength marker */}
      <g transform={`translate(${LEFT} ${bracketY})`}>
        <line x1={0} x2={bracketW} y1={0} y2={0} stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={0} x2={0} y1={-7} y2={7} stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" />
        <line x1={bracketW} x2={bracketW} y1={-7} y2={7} stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" />
        <text x={Math.max(bracketW / 2, 30)} y={22} textAnchor="middle" className="fill-brand text-[13px] font-bold">
          λ = {short(wavelength)} m
        </text>
      </g>
      <line x1={LEFT} x2={LEFT} y1={MID - AMP - 6} y2={bracketY} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.5} />
      <line x1={LEFT + bracketW} x2={LEFT + bracketW} y1={MID - AMP - 6} y2={bracketY} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.5} />

      {/* metre ruler */}
      {meters.map((m) => (
        <g key={m}>
          <line x1={LEFT + m * PX_PER_M} x2={LEFT + m * PX_PER_M} y1={SCENE.h - 22} y2={SCENE.h - 14} stroke="var(--line-strong)" strokeWidth={2} />
          <text x={LEFT + m * PX_PER_M} y={SCENE.h - 2} textAnchor="middle" className="fill-muted text-[11px] font-bold">
            {m} m
          </text>
        </g>
      ))}

      <g transform={`translate(${RIGHT} 22)`}>
        <text textAnchor="end" className="fill-muted text-[12px] font-bold">
          {still ? "Paused (reduced motion)" : `Slow motion ×¼ · ${short(frequency)} Hz`}
        </text>
      </g>
    </svg>
  );
}
