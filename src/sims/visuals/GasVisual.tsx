"use client";

import { useRef } from "react";
import { rng } from "@/lib/rng";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, short } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

const BOX_L = 196;
const BOX_R = 404;
const FLOOR = 186;
const MAX_H = 150; // px of cylinder for the largest volume
const MAX_VOLUME = 50;
const R_DOT = 5;

type Particle = { u: number; v: number; dx: number; dy: number };

function spawn(count: number): Particle[] {
  const next = rng(count * 7919 + 13);
  return Array.from({ length: count }, () => {
    const ang = next() * Math.PI * 2;
    return { u: next(), v: next(), dx: Math.cos(ang), dy: Math.sin(ang) };
  });
}

/** A cylinder with a piston. Particles speed up with temperature and crowd together in a smaller volume. */
export function GasVisual({ params, outputs }: SimVisualProps) {
  const { moles, temperature, volume } = params;
  const still = useStaticPose();
  const count = clamp(Math.round(6 + moles * 16), 6, 80);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const particles = useRef<Particle[]>([]);

  const height = clamp(volume / MAX_VOLUME, 0.06, 1) * MAX_H;
  const top = FLOOR - height;
  const innerW = BOX_R - BOX_L - 2 * R_DOT - 6;
  const innerH = Math.max(4, height - 2 * R_DOT - 10);
  const speed = 70 * Math.sqrt(temperature / 300); // px/s
  const heat = clamp((temperature - 100) / 500, 0, 1);
  const color = `color-mix(in oklch, var(--wrong) ${Math.round(heat * 100)}%, var(--gem))`;

  useFrame((_, dt) => {
    if (particles.current.length !== count) particles.current = spawn(count);
    particles.current.forEach((p, k) => {
      p.u += (p.dx * speed * dt) / innerW;
      p.v += (p.dy * speed * dt) / innerH;
      if (p.u < 0 || p.u > 1) {
        p.dx = -p.dx;
        p.u = clamp(p.u, 0, 1);
      }
      if (p.v < 0 || p.v > 1) {
        p.dy = -p.dy;
        p.v = clamp(p.v, 0, 1);
      }
      const x = BOX_L + 3 + R_DOT + p.u * innerW;
      const y = FLOOR - 3 - R_DOT - p.v * innerH;
      dots.current[k]?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
  }, !still);

  // Thermometer on the left.
  const thermoTop = 34;
  const thermoBottom = 168;
  const mercury = (thermoBottom - thermoTop - 10) * clamp((temperature - 50) / 600, 0.05, 1);

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full" role="img" aria-label={`${short(moles)} mol of gas at ${temperature} K in ${volume} L: ${short(outputs.pressure)} kPa`}>
      {/* cylinder */}
      <rect x={BOX_L} y={FLOOR - MAX_H - 8} width={BOX_R - BOX_L} height={MAX_H + 8} rx={10} fill="var(--surface-2)" />
      <rect x={BOX_L} y={top} width={BOX_R - BOX_L} height={height} fill={color} opacity={0.1} />

      {Array.from({ length: count }, (_, k) => (
        <circle
          key={k}
          ref={(el) => {
            dots.current[k] = el;
          }}
          r={R_DOT}
          transform={`translate(${BOX_L + 20 + ((k * 37) % 170)} ${FLOOR - 12 - ((k * 23) % Math.max(1, height - 24))})`}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={1.5}
        />
      ))}

      {/* piston */}
      <g className="transition-transform duration-200 ease-[var(--ease-out)]" style={{ transform: `translateY(${top}px)` }}>
        <rect x={(BOX_L + BOX_R) / 2 - 7} y={-120} width={14} height={120} rx={5} fill="var(--line-strong)" />
        <rect x={BOX_L + 2} y={-14} width={BOX_R - BOX_L - 4} height={14} rx={5} fill="var(--ink-soft)" />
        <rect x={(BOX_L + BOX_R) / 2 - 22} y={-128} width={44} height={12} rx={6} fill="var(--ink-soft)" />
      </g>

      <path
        d={`M${BOX_L} ${FLOOR - MAX_H - 10}V${FLOOR}H${BOX_R}V${FLOOR - MAX_H - 10}`}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* volume label */}
      <g className="transition-transform duration-200 ease-[var(--ease-out)]" style={{ transform: `translateY(${(top + FLOOR) / 2}px)` }}>
        <line x1={BOX_R + 14} x2={BOX_R + 14} y1={-height / 2 + 2} y2={height / 2 - 2} stroke="var(--brand)" strokeWidth={2} />
        <text x={BOX_R + 24} y={5} className="fill-ink text-[14px] font-bold">
          {short(volume)} L
        </text>
      </g>

      {/* thermometer */}
      <g>
        <rect x={102} y={thermoTop} width={16} height={thermoBottom - thermoTop} rx={8} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={2} />
        <rect x={106} y={thermoBottom - 6 - mercury} width={8} height={mercury} rx={4} fill={color} className="transition-[height,y] duration-200" />
        <circle cx={110} cy={thermoBottom + 6} r={12} fill={color} stroke="var(--surface)" strokeWidth={2} />
        <text x={92} y={thermoBottom + 11} textAnchor="end" className="fill-ink text-[14px] font-bold">
          {Math.round(temperature)} K
        </text>
      </g>

      <text x={(BOX_L + BOX_R) / 2} y={FLOOR + 20} textAnchor="middle" className="fill-muted text-[13px] font-bold">
        {short(moles)} mol of gas
      </text>
    </svg>
  );
}
