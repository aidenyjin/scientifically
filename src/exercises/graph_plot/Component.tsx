"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { useHotkeys } from "@/lib/keyboard";
import { formatNumber } from "../_shared/numbers";
import { toUnicodeText } from "../_shared/unicodeText";
import { matchPoints } from "./grade";
import { cellValue, gridSize, sameCell, snapToCell, type Cell } from "./grid";
import { PlotGrid, unproject, VIEW, type PlacedState } from "./PlotGrid";
import type { GraphPlot, GraphPlotResponse } from "./schema";

export function GraphPlotView({ exercise, status, onChange }: ExerciseProps<GraphPlot, GraphPlotResponse>) {
  const { axes } = exercise;
  const needed = exercise.points.length;
  const { nx, ny } = gridSize(axes);
  const locked = status !== "answering";

  const [placed, setPlaced] = useState<Cell[]>([]);
  const [cursor, setCursor] = useState<Cell>({ i: Math.round(nx / 2), j: Math.round(ny / 2) });
  const [hovering, setHovering] = useState(false);
  const [usedKeys, setUsedKeys] = useState(false);
  const [full, setFull] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const fullTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpId = useId();
  useEffect(() => () => clearTimeout(fullTimer.current ?? undefined), []);

  const values = (cells: Cell[]) => cells.map((c) => cellValue(axes, c));
  const describe = (c: Cell) => {
    const [x, y] = cellValue(axes, c);
    return `(${toUnicodeText(formatNumber(x))}, ${toUnicodeText(formatNumber(y))})`;
  };

  const toggle = (cell: Cell) => {
    if (locked) return;
    const existing = placed.findIndex((p) => sameCell(p, cell));
    let next: Cell[];
    if (existing >= 0) {
      next = placed.filter((_, k) => k !== existing);
      setAnnouncement(`Removed point ${describe(cell)}. ${next.length} of ${needed} placed.`);
    } else if (placed.length >= needed) {
      setFull(true);
      setAnnouncement(`All ${needed} points are placed. Remove one first.`);
      if (fullTimer.current) clearTimeout(fullTimer.current);
      fullTimer.current = setTimeout(() => setFull(false), 1400);
      return;
    } else {
      next = [...placed, cell];
      setAnnouncement(`Placed point ${describe(cell)}. ${next.length} of ${needed} placed.`);
    }
    setPlaced(next);
    setFull(false);
    onChange(next.length === needed ? { points: values(next).sort((a, b) => a[0] - b[0] || a[1] - b[1]) } : null);
  };

  const move = (di: number, dj: number) => {
    setUsedKeys(true);
    setCursor((c) => ({ i: Math.max(0, Math.min(nx, c.i + di)), j: Math.max(0, Math.min(ny, c.j + dj)) }));
  };

  useHotkeys(
    {
      ArrowLeft: () => move(-1, 0),
      ArrowRight: () => move(1, 0),
      ArrowUp: () => move(0, 1),
      ArrowDown: () => move(0, -1),
      " ": () => {
        setUsedKeys(true);
        toggle(cursor);
      },
    },
    { enabled: !locked },
  );

  const cellAt = (clientX: number, clientY: number): Cell | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * VIEW.w;
    const py = ((clientY - rect.top) / rect.height) * VIEW.h;
    const pad = 14;
    if (px < VIEW.left - pad || px > VIEW.w - VIEW.right + pad || py < VIEW.top - pad || py > VIEW.h - VIEW.bottom + pad) {
      return null;
    }
    return snapToCell(axes, ...unproject(axes, px, py));
  };

  const placedStates: PlacedState[] = locked
    ? matchPoints(exercise.points, values(placed), exercise.tolerance).placedMatched.map((ok) => (ok ? "correct" : "wrong"))
    : placed.map(() => "placed");

  return (
    <div className="mx-auto grid w-full max-w-[640px] gap-3">
      <div
        role="group"
        aria-label={`Plotting grid. ${toUnicodeText(axes.xLabel)} across, ${toUnicodeText(axes.yLabel)} up.`}
        aria-describedby={helpId}
        className={cn(
          "rounded-3xl border-2 bg-surface p-2 shadow-card transition-colors duration-200",
          status === "answering" && "border-line",
          status === "correct" && "border-correct",
          status === "incorrect" && "border-wrong",
        )}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          className={cn("block h-auto w-full touch-manipulation select-none", !locked && "cursor-crosshair")}
          onPointerMove={(e) => {
            if (locked) return;
            const cell = cellAt(e.clientX, e.clientY);
            setHovering(cell !== null);
            if (cell && !sameCell(cell, cursor)) setCursor(cell);
          }}
          onPointerLeave={() => setHovering(false)}
          onClick={(e) => {
            const cell = cellAt(e.clientX, e.clientY);
            if (!cell) return;
            setCursor(cell);
            toggle(cell);
          }}
        >
          <PlotGrid
            axes={axes}
            placed={placed}
            placedStates={placedStates}
            cursor={cursor}
            showCursor={!locked && (hovering || usedKeys)}
            targets={locked ? exercise.points : null}
            correct={status === "correct"}
            connect={exercise.connect ?? false}
          />
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <Counter placed={placed.length} needed={needed} full={full} locked={locked} />
        <p id={helpId} className={cn("flex flex-wrap items-center gap-1.5 text-sm font-semibold text-muted", locked && "invisible")}>
          Click a gridpoint, or move with <Kbd>←</Kbd>
          <Kbd>↑</Kbd>
          <Kbd>→</Kbd>
          <Kbd>↓</Kbd> and press <Kbd>Space</Kbd> to place or remove
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function Counter({ placed, needed, full, locked }: { placed: number; needed: number; full: boolean; locked: boolean }) {
  const done = placed === needed && !locked;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: needed }, (_, k) => (
          <span
            key={k}
            className={cn(
              "size-2.5 rounded-full transition-colors duration-150",
              k >= placed ? "bg-line-strong" : locked ? "bg-muted" : done ? "bg-correct" : "bg-brand",
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "font-display text-[15px] font-semibold tabular-nums transition-colors duration-150",
          full ? "text-streak-dark" : done ? "text-correct-ink" : "text-ink-soft",
        )}
      >
        {full ? "All points placed: remove one first" : `${placed} / ${needed} points placed`}
      </span>
    </div>
  );
}
