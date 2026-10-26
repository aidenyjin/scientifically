"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatNumber } from "../_shared/numbers";
import { toUnicodeText } from "../_shared/unicodeText";
import { cellValue, gridSize, labelStride, type Cell } from "./grid";
import type { GraphPlot } from "./schema";

export const VIEW = { w: 560, h: 360, left: 66, right: 18, top: 16, bottom: 54 } as const;
const PLOT_W = VIEW.w - VIEW.left - VIEW.right;
const PLOT_H = VIEW.h - VIEW.top - VIEW.bottom;
const EASE = [0.23, 1, 0.32, 1] as const;

type Axes = GraphPlot["axes"];
export type PlacedState = "placed" | "correct" | "wrong";

/** Data → SVG coordinates. */
export function project(axes: Axes, x: number, y: number): [number, number] {
  return [
    VIEW.left + ((x - axes.xMin) / (axes.xMax - axes.xMin)) * PLOT_W,
    VIEW.top + (1 - (y - axes.yMin) / (axes.yMax - axes.yMin)) * PLOT_H,
  ];
}

/** SVG coordinates → data. */
export function unproject(axes: Axes, px: number, py: number): [number, number] {
  return [
    axes.xMin + ((px - VIEW.left) / PLOT_W) * (axes.xMax - axes.xMin),
    axes.yMin + (1 - (py - VIEW.top) / PLOT_H) * (axes.yMax - axes.yMin),
  ];
}

const label = (n: number) => toUnicodeText(formatNumber(n));
const polyline = (pts: [number, number][]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** The static grid, axes and labels. */
function Grid({ axes }: { axes: Axes }) {
  const { nx, ny } = gridSize(axes);
  const xStride = labelStride(nx, PLOT_W, 34);
  const yStride = labelStride(ny, PLOT_H, 24);
  const [x0] = project(axes, axes.xMin <= 0 && axes.xMax >= 0 ? 0 : axes.xMin, 0);
  const [, y0] = project(axes, 0, axes.yMin <= 0 && axes.yMax >= 0 ? 0 : axes.yMin);
  return (
    <g>
      {Array.from({ length: nx + 1 }, (_, i) => {
        const [px] = project(axes, cellValue(axes, { i, j: 0 })[0], 0);
        return (
          <g key={`x${i}`}>
            <line x1={px} x2={px} y1={VIEW.top} y2={VIEW.top + PLOT_H} stroke="var(--line)" strokeWidth={i % xStride === 0 ? 1.5 : 1} />
            {i % xStride === 0 && (
              <text x={px} y={VIEW.top + PLOT_H + 20} textAnchor="middle" className="fill-muted text-[13px] font-bold">
                {label(cellValue(axes, { i, j: 0 })[0])}
              </text>
            )}
          </g>
        );
      })}
      {Array.from({ length: ny + 1 }, (_, j) => {
        const [, py] = project(axes, 0, cellValue(axes, { i: 0, j })[1]);
        return (
          <g key={`y${j}`}>
            <line x1={VIEW.left} x2={VIEW.left + PLOT_W} y1={py} y2={py} stroke="var(--line)" strokeWidth={j % yStride === 0 ? 1.5 : 1} />
            {j % yStride === 0 && (
              <text x={VIEW.left - 10} y={py + 4.5} textAnchor="end" className="fill-muted text-[13px] font-bold">
                {label(cellValue(axes, { i: 0, j })[1])}
              </text>
            )}
          </g>
        );
      })}
      <line x1={x0} x2={x0} y1={VIEW.top} y2={VIEW.top + PLOT_H} stroke="var(--line-strong)" strokeWidth={2} strokeLinecap="round" />
      <line x1={VIEW.left} x2={VIEW.left + PLOT_W} y1={y0} y2={y0} stroke="var(--line-strong)" strokeWidth={2} strokeLinecap="round" />
      <text x={VIEW.left + PLOT_W / 2} y={VIEW.h - 8} textAnchor="middle" className="fill-ink-soft text-[14px] font-bold">
        {toUnicodeText(axes.xLabel)}
      </text>
      <text
        transform={`translate(18 ${VIEW.top + PLOT_H / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-ink-soft text-[14px] font-bold"
      >
        {toUnicodeText(axes.yLabel)}
      </text>
    </g>
  );
}

const pointFill: Record<PlacedState, string> = {
  placed: "var(--brand)",
  correct: "var(--correct)",
  wrong: "var(--wrong)",
};

export function PlotGrid({
  axes,
  placed,
  placedStates,
  cursor,
  showCursor,
  targets,
  correct,
  connect,
}: {
  axes: Axes;
  placed: Cell[];
  placedStates: PlacedState[];
  cursor: Cell;
  showCursor: boolean;
  /** Shown after checking: the correct points (green rings). */
  targets: [number, number][] | null;
  /** After checking: whether the whole answer was right. */
  correct: boolean;
  connect: boolean;
}) {
  const reduce = useReducedMotion();
  const placedPx = placed.map((c) => project(axes, ...cellValue(axes, c)));
  const sortedPx = [...placedPx].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const targetPx = targets ? [...targets].sort((a, b) => a[0] - b[0]).map(([x, y]) => project(axes, x, y)) : [];
  const [cx, cy] = project(axes, ...cellValue(axes, cursor));
  const [cursorX, cursorY] = cellValue(axes, cursor);
  const tagRight = cx < VIEW.left + PLOT_W - 90;
  const tagUp = cy > VIEW.top + 34;

  return (
    <>
      <Grid axes={axes} />

      {targets && !correct && connect && (
        <polyline points={polyline(targetPx)} fill="none" stroke="var(--correct)" strokeWidth={2.5} strokeDasharray="6 6" strokeLinecap="round" opacity={0.7} />
      )}
      {connect && sortedPx.length > 1 && (
        <polyline
          points={polyline(sortedPx)}
          fill="none"
          stroke={!targets ? "var(--brand)" : correct ? "var(--correct)" : "var(--ink-soft)"}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={targets && !correct ? 0.45 : 0.85}
        />
      )}

      {showCursor && (
        <g pointerEvents="none" aria-hidden>
          <line x1={cx} x2={cx} y1={VIEW.top} y2={VIEW.top + PLOT_H} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.55} />
          <line x1={VIEW.left} x2={VIEW.left + PLOT_W} y1={cy} y2={cy} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 5" opacity={0.55} />
          <circle cx={cx} cy={cy} r={12} fill="var(--brand)" fillOpacity={0.12} stroke="var(--brand)" strokeWidth={2} />
          <g transform={`translate(${cx + (tagRight ? 16 : -16)} ${cy + (tagUp ? -16 : 16)})`}>
            <rect x={tagRight ? 0 : -76} y={-13} width={76} height={26} rx={9} fill="var(--surface)" stroke="var(--line-strong)" strokeWidth={1.5} />
            <text x={tagRight ? 38 : -38} y={5} textAnchor="middle" className="fill-ink text-[13px] font-bold tabular-nums">
              ({label(cursorX)}, {label(cursorY)})
            </text>
          </g>
        </g>
      )}

      {targetPx.map(([x, y], k) => (
        <circle key={`t${k}`} cx={x} cy={y} r={13} fill="none" stroke="var(--correct)" strokeWidth={3} pointerEvents="none" />
      ))}

      <AnimatePresence initial={false}>
        {placed.map((c, k) => {
          const [x, y] = placedPx[k];
          return (
            <motion.circle
              key={`${c.i}:${c.j}`}
              cx={x}
              cy={y}
              r={8}
              fill={pointFill[placedStates[k] ?? "placed"]}
              stroke="var(--surface)"
              strokeWidth={3}
              pointerEvents="none"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={reduce ? false : { opacity: 0, transform: "scale(0.6)" }}
              animate={{ opacity: 1, transform: "scale(1)", transition: { duration: 0.16, ease: EASE } }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transform: "scale(0.8)", transition: { duration: 0.1, ease: EASE } }}
            />
          );
        })}
      </AnimatePresence>
    </>
  );
}
