import { Character } from "@/characters/Character";
import type { CharacterId } from "@/characters/types";
import type { PathLesson } from "./types";

/**
 * The illustration in the "Up next" card: the current unit's lessons as
 * stops along a ridge on a lab-notebook grid, with the unit's guide standing
 * by the next stop.
 *
 * Drawn in a 600×240 box and scaled as one piece (aspect ratio locked), so
 * the HTML-positioned character always lines up with the SVG stops.
 *
 * Motion (seen a few times a day, so kept short): the walked part of the
 * path draws in once (700ms, ease-out), stops settle in with a 40ms stagger,
 * the next stop breathes. All of it is transform/opacity/dashoffset and is
 * switched off by reduced motion.
 */
const W = 600;
const H = 240;
const X0 = 76;
const X1 = 524;

/** The ridge the stops sit on: a gentle arch, highest in the middle. */
function ridgeY(x: number) {
  const t = (x - X0) / (X1 - X0);
  return 186 - 56 * 4 * t * (1 - t);
}

/** Smooth path through the given points (Catmull-Rom → cubic Bézier). */
function smooth(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export function UpNextScene({
  lessons,
  characterId,
  label,
  caption,
}: {
  lessons: PathLesson[];
  characterId: CharacterId;
  label: string;
  /** Short mono tag in the top-left corner, e.g. "Unit 1 · Lesson 2 of 4". */
  caption?: string;
}) {
  const n = lessons.length;
  const stops = lessons.map((l, i) => {
    const x = n === 1 ? W / 2 : X0 + ((X1 - X0) * i) / (n - 1);
    return { lesson: l, x, y: ridgeY(x) - 2 };
  });
  const currentIndex = Math.max(
    0,
    stops.findIndex((s) => s.lesson.state === "current"),
  );
  const allDone = lessons.every((l) => l.state === "completed");
  const reach = allDone ? n - 1 : currentIndex;

  const ridge: [number, number][] = [];
  for (let x = -20; x <= W + 20; x += 20) ridge.push([x, ridgeY(x) + 6]);
  const hill = `${smooth(ridge)} L${W + 20} ${H + 10} L-20 ${H + 10} Z`;
  const far: [number, number][] = [];
  for (let x = -20; x <= W + 20; x += 20)
    far.push([x, 150 - 26 * Math.sin(((x + 60) / W) * Math.PI * 1.15)]);
  const farHill = `${smooth(far)} L${W + 20} ${H + 10} L-20 ${H + 10} Z`;
  const walked = smooth(stops.slice(0, reach + 1).map((s) => [s.x, s.y]));
  const ahead = smooth(stops.slice(reach).map((s) => [s.x, s.y]));

  // The guide stands on the ridge beside the next stop (to its left, or its
  // right when the next stop is the first one).
  const here = stops[allDone ? n - 1 : currentIndex];
  const side = here && (currentIndex === 0 && !allDone ? 1 : -1);
  const guideX = here ? here.x + side * 78 : W / 2;
  const guideSize = 136;
  // The art's feet sit at ~0.93 of its box.
  const guideTop = ridgeY(guideX) + 4 - guideSize * 0.93;

  return (
    <div
      role="img"
      aria-label={label}
      className="bg-sage relative aspect-[5/2] w-full overflow-hidden rounded-2xl"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <pattern id="upnext-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.9" fill="var(--ink)" opacity="0.13" />
          </pattern>
          {/* Soft light from above the ridge, so the scene isn't a flat swatch. */}
          <radialGradient id="upnext-light" cx="0.62" cy="0.18" r="0.75">
            <stop offset="0" stopColor="var(--panel)" stopOpacity="0.75" />
            <stop offset="1" stopColor="var(--panel)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#upnext-light)" />
        <rect width={W} height={H} fill="url(#upnext-grid)" />
        {/* A far ridge for depth, then the near one the stops sit on. */}
        <path d={farHill} fill="color-mix(in oklab, var(--sage) 90%, var(--sage-ink))" />
        <path d={hill} fill="color-mix(in oklab, var(--sage) 82%, var(--sage-ink))" />
        <path d={hill} fill="none" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="1" />

        {/* The road ahead, then the walked part drawn over it. */}
        {n > 1 && reach < n - 1 && (
          <path
            d={ahead}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.38"
            strokeWidth="1.5"
            strokeDasharray="1.5 6"
            strokeLinecap="round"
          />
        )}
        {n > 1 && reach > 0 && (
          <path
            d={walked}
            pathLength={1}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="animate-[draw-line_700ms_var(--ease-out)_both]"
            style={{ strokeDasharray: 1 }}
          />
        )}

        {stops.map(({ lesson, x, y }, i) => {
          const done = lesson.state === "completed";
          const current = !allDone && i === currentIndex;
          const checkpoint = lesson.kind === "checkpoint";
          const delay = { animationDelay: `${120 + i * 40}ms` };
          return (
            <g key={lesson.id}>
              <g
                className="animate-[stop-in_260ms_var(--ease-out)_both]"
                style={{ ...delay, transformBox: "fill-box", transformOrigin: "center" }}
              >
                {current && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12.5"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="1.25"
                    className="animate-[halo_2.6s_var(--ease-out)_infinite]"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                )}
                {checkpoint ? (
                  <rect
                    x={x - 7}
                    y={y - 7}
                    width="14"
                    height="14"
                    rx="2.5"
                    transform={`rotate(45 ${x} ${y})`}
                    fill={done ? "var(--ink)" : "var(--panel)"}
                    stroke="var(--ink)"
                    strokeOpacity={done || current ? 1 : 0.45}
                    strokeWidth="1.5"
                  />
                ) : current ? (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="12.5"
                      fill="var(--panel)"
                      stroke="var(--ink)"
                      strokeWidth="1.75"
                    />
                    <circle cx={x} cy={y} r="5" fill="var(--brand)" />
                  </>
                ) : (
                  <circle
                    cx={x}
                    cy={y}
                    r="7"
                    fill={done ? "var(--ink)" : "var(--panel)"}
                    stroke="var(--ink)"
                    strokeOpacity={done ? 1 : 0.45}
                    strokeWidth="1.5"
                  />
                )}
              </g>
              <text
                x={x}
                y={y + 28}
                textAnchor="middle"
                className="font-mono"
                fontSize="10.5"
                letterSpacing="0.04em"
                fill="var(--ink)"
                fillOpacity={current ? 0.9 : 0.5}
              >
                {checkpoint ? "REVIEW" : String(lesson.number).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>

      {caption && (
        <span className="bg-panel/85 text-ink absolute top-3.5 left-3.5 rounded-full px-2.5 py-1 font-mono text-[11px] backdrop-blur-sm">
          {caption}
        </span>
      )}
      <div
        className="pointer-events-none absolute animate-[guide-in_420ms_var(--ease-out)_both] [animation-delay:260ms]"
        style={{
          left: pct(guideX - guideSize / 2, W),
          top: pct(guideTop, H),
          width: pct(guideSize, W),
        }}
      >
        <Character
          id={characterId}
          expression={allDone ? "celebrate" : "happy"}
          size={guideSize}
          animate
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
