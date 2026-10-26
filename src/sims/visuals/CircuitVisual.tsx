"use client";

import { useRef } from "react";
import { useFrame, useStaticPose } from "./hooks";
import { clamp, short } from "./scale";
import { SCENE, type SimVisualProps } from "./types";

// The wire loop: a rounded rectangle.
const L = 120;
const R = 440;
const T = 40;
const B = 176;
const RAD = 22;
const DOTS = 16;

/** Point at distance `d` along the rounded-rectangle loop, clockwise from the top-left. */
function pointOnLoop(d: number): [number, number] {
  const w = R - L - 2 * RAD;
  const h = B - T - 2 * RAD;
  const arc = (Math.PI * RAD) / 2;
  const total = 2 * w + 2 * h + 4 * arc;
  let s = ((d % total) + total) % total;
  const corner = (cx: number, cy: number, from: number, t: number): [number, number] => {
    const ang = from + (t / arc) * (Math.PI / 2);
    return [cx + RAD * Math.cos(ang), cy + RAD * Math.sin(ang)];
  };
  if (s < w) return [L + RAD + s, T];
  s -= w;
  if (s < arc) return corner(R - RAD, T + RAD, -Math.PI / 2, s);
  s -= arc;
  if (s < h) return [R, T + RAD + s];
  s -= h;
  if (s < arc) return corner(R - RAD, B - RAD, 0, s);
  s -= arc;
  if (s < w) return [R - RAD - s, B];
  s -= w;
  if (s < arc) return corner(L + RAD, B - RAD, Math.PI / 2, s);
  s -= arc;
  if (s < h) return [L, B - RAD - s];
  s -= h;
  return corner(L + RAD, T + RAD, Math.PI, s);
}

const LOOP_LENGTH = 2 * (R - L - 2 * RAD) + 2 * (B - T - 2 * RAD) + 2 * Math.PI * RAD;

/** Battery → resistor → bulb. Charges flow faster with more current; the bulb glows with power. */
export function CircuitVisual({ params, outputs }: SimVisualProps) {
  const { voltage, resistance } = params;
  const { current, power } = outputs;
  const still = useStaticPose();
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const travelled = useRef(0);

  const speed = 18 + 90 * Math.log10(1 + Math.max(0, current) * 9); // px/s
  const glow = clamp((Math.log10(Math.max(power, 1e-6)) + 1) / 3.2, 0, 1);

  useFrame((_, dt) => {
    travelled.current += speed * dt;
    dots.current.forEach((el, k) => {
      if (!el) return;
      const [x, y] = pointOnLoop(travelled.current + (k * LOOP_LENGTH) / DOTS);
      el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    });
  }, !still);

  const bulbX = R;
  const bulbY = (T + B) / 2;
  const batteryY = (T + B) / 2;
  const zig = Array.from({ length: 7 }, (_, k) => `l8 ${k % 2 ? 12 : -12}`).join("");

  return (
    <svg viewBox={`0 0 ${SCENE.w} ${SCENE.h}`} className="block h-auto w-full" role="img" aria-label={`Circuit: ${voltage} V across ${resistance} Ω gives ${short(current)} A`}>
      <rect x={L} y={T} width={R - L} height={B - T} rx={RAD} fill="none" stroke="var(--ink-soft)" strokeWidth={5} opacity={0.85} />

      {/* moving charges (under the components) */}
      {Array.from({ length: DOTS }, (_, k) => {
        const [x, y] = pointOnLoop((k * LOOP_LENGTH) / DOTS);
        return (
          <circle
            key={k}
            ref={(el) => {
              dots.current[k] = el;
            }}
            r={4}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
            fill="var(--gem)"
            stroke="var(--surface)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* battery (left side) */}
      <g transform={`translate(${L} ${batteryY})`}>
        <rect x={-30} y={-22} width={60} height={44} fill="var(--surface)" />
        <line x1={-26} x2={26} y1={-9} y2={-9} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
        <line x1={-14} x2={14} y1={9} y2={9} stroke="var(--ink)" strokeWidth={8} strokeLinecap="round" />
        <text x={-34} y={-4} textAnchor="end" className="fill-wrong text-[15px] font-bold">
          +
        </text>
        <text x={-38} y={22} textAnchor="end" className="fill-ink text-[15px] font-bold">
          {short(voltage)} V
        </text>
      </g>

      {/* resistor (top) */}
      <g transform={`translate(${(L + R) / 2 - 36} ${T})`}>
        <rect x={-4} y={-16} width={80} height={32} fill="var(--surface)" />
        <path d={`M0 0l4 0${zig}l4 0`} fill="none" stroke="var(--streak)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        <text x={36} y={-22} textAnchor="middle" className="fill-ink text-[15px] font-bold">
          {short(resistance)} Ω
        </text>
      </g>

      {/* bulb (right side) */}
      <g transform={`translate(${bulbX} ${bulbY})`}>
        <circle
          r={52}
          fill="var(--xp)"
          className="transition-[opacity,transform] duration-200 ease-[var(--ease-out)]"
          style={{ opacity: 0.08 + 0.5 * glow, transform: `scale(${0.45 + 0.55 * glow})`, transformBox: "fill-box", transformOrigin: "center", filter: "blur(10px)" }}
        />
        {Array.from({ length: 8 }, (_, k) => {
          const ang = (k * Math.PI) / 4;
          return (
            <line
              key={k}
              x1={34 * Math.cos(ang)}
              y1={34 * Math.sin(ang)}
              x2={44 * Math.cos(ang)}
              y2={44 * Math.sin(ang)}
              stroke="var(--xp-dark)"
              strokeWidth={3.5}
              strokeLinecap="round"
              className="transition-opacity duration-200"
              style={{ opacity: clamp((glow - 0.45) * 2, 0, 1) }}
            />
          );
        })}
        <rect x={-10} y={14} width={20} height={14} rx={3} fill="var(--ink-soft)" />
        <circle r={22} fill="var(--surface)" stroke="var(--ink-soft)" strokeWidth={3} />
        <circle
          r={20}
          fill="var(--xp)"
          className="transition-opacity duration-200"
          style={{ opacity: 0.1 + 0.9 * glow }}
        />
        <path d="M-6 14V3M6 14V3M-6 3C-6 -11 6 -11 6 3" fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
        <text x={34} y={50} textAnchor="start" className="fill-ink text-[14px] font-bold">
          {short(power)} W
        </text>
      </g>

      {/* ammeter reading on the bottom wire */}
      <g transform={`translate(${(L + R) / 2} ${B})`}>
        <rect x={-42} y={-15} width={84} height={30} rx={15} fill="var(--surface)" stroke="var(--gem)" strokeWidth={2.5} />
        <text y={5.5} textAnchor="middle" className="fill-ink text-[14px] font-bold tabular-nums">
          {short(current)} A
        </text>
      </g>
    </svg>
  );
}
