"use client";

import { BookOpen, Check, ChevronDown, Lock, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { TrophyIcon } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { useHotkeys } from "@/lib/keyboard";
import { cn } from "@/lib/cn";
import { PathNode } from "./PathNode";
import type { PathLesson, PathUnit } from "./types";

/** Horizontal offsets (px) that make the path wind gently. */
const WAVE = [0, 44, 68, 44, 0, -44, -68, -44];
/** Height of one stop's row (px). */
const ROW = 84;
/** Where the path's spine sits, from the card's inner left edge (px). */
const SPINE = 170;

export function CoursePath({
  units,
  currentLessonId,
}: {
  units: PathUnit[];
  currentLessonId: string | null;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [guide, setGuide] = useState<PathUnit | null>(null);
  // Units that are finished or not started yet start folded, so the open one leads.
  const [folded, setFolded] = useState<Set<string>>(() => {
    const hasCurrent = (u: PathUnit) => u.lessons.some((l) => l.state === "current");
    if (!units.some(hasCurrent)) return new Set();
    return new Set(units.filter((u) => !hasCurrent(u)).map((u) => u.id));
  });
  const close = useCallback(() => setOpenId(null), []);
  const toggleFold = (id: string) =>
    setFolded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Laptop shortcut: Enter starts the next lesson when nothing is open.
  useHotkeys(
    { Enter: () => currentLessonId && router.push(`/lesson/${currentLessonId}`) },
    { enabled: !openId && !guide && currentLessonId !== null },
  );

  return (
    <div className="grid gap-4 pb-40">
      {units.map((unit) => {
        const isFolded = folded.has(unit.id);
        return (
          <section
            key={unit.id}
            aria-labelledby={`unit-${unit.id}`}
            className="border-line bg-surface shadow-card rounded-3xl border"
          >
            <header className="flex items-center gap-3 px-7 py-6">
              <button
                type="button"
                onClick={() => toggleFold(unit.id)}
                aria-expanded={!isFolded}
                aria-controls={`unit-path-${unit.id}`}
                className="group -m-2 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-muted block text-[11px] font-medium tracking-[0.16em] uppercase">
                    Unit {unit.index + 1}
                  </span>
                  <span
                    id={`unit-${unit.id}`}
                    className="font-heading mt-1 block truncate text-[28px] leading-tight tracking-[-0.01em]"
                  >
                    {unit.title}
                  </span>
                  <span className="text-ink-soft mt-0.5 block truncate text-sm">
                    {unit.description}
                  </span>
                </span>
                <span className="text-ink-soft shrink-0 font-mono text-xs tabular-nums">
                  {unit.completed} / {unit.lessons.length}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "text-muted size-5 shrink-0 transition-transform duration-200 ease-[var(--ease-out)]",
                    !isFolded && "rotate-180",
                  )}
                  strokeWidth={1.8}
                />
              </button>
              <button
                type="button"
                onClick={() => setGuide(unit)}
                aria-label={`Unit ${unit.index + 1} guidebook`}
                title="Guidebook"
                className="pressable border-line text-ink-soft hover:bg-surface-2 hover:text-ink grid size-10 shrink-0 place-items-center rounded-xl border [--edge:transparent]"
              >
                <BookOpen className="size-[18px]" strokeWidth={1.7} />
              </button>
            </header>

            {!isFolded && (
              <div id={`unit-path-${unit.id}`} className="border-line border-t px-7 pt-6 pb-8">
                <UnitPath
                  unit={unit}
                  openId={openId}
                  onToggle={(id) => setOpenId((v) => (v === id ? null : id))}
                  onClose={close}
                />
              </div>
            )}
          </section>
        );
      })}

      <Modal
        open={guide !== null}
        onClose={() => setGuide(null)}
        label="Unit guidebook"
        className="max-w-lg"
      >
        {guide && (
          <div>
            <button
              type="button"
              onClick={() => setGuide(null)}
              aria-label="Close guidebook"
              className="text-muted hover:bg-surface-2 hover:text-ink absolute top-4 right-4 grid size-10 place-items-center rounded-xl transition-colors duration-150"
            >
              <X className="size-5" strokeWidth={1.8} />
            </button>
            <p className="text-muted pr-10 text-[11px] font-medium tracking-[0.16em] uppercase">
              Unit {guide.index + 1} guidebook · {guide.completed} of {guide.lessons.length} done
            </p>
            <h2 className="font-heading mt-1.5 pr-10 text-[30px] leading-tight">{guide.title}</h2>
            <p className="text-ink-soft mt-1">{guide.description}</p>
            <ol className="mt-5 -mr-2 grid max-h-[50vh] gap-2 overflow-y-auto pr-2">
              {guide.lessons.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    "flex gap-3 rounded-2xl border p-3.5",
                    l.state === "current" ? "border-brand bg-brand-soft/40" : "border-line",
                  )}
                >
                  <GuideIcon lesson={l} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{l.title}</span>
                      <span className="text-muted shrink-0 font-mono text-[11px]">
                        {l.kind === "checkpoint" ? "Review" : `Lesson ${l.number}`}
                      </span>
                    </p>
                    <ul className="text-ink-soft mt-1 grid gap-0.5 text-sm">
                      {l.objectives.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** The winding line of stops for one unit, joined by a thin road. */
function UnitPath({
  unit,
  openId,
  onToggle,
  onClose,
}: {
  unit: PathUnit;
  openId: string | null;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const points = unit.lessons.map(
    (_, i) => [SPINE + WAVE[i % WAVE.length], i * ROW + ROW / 2] as const,
  );
  const reach = (() => {
    const cur = unit.lessons.findIndex((l) => l.state === "current");
    if (cur >= 0) return cur;
    const lastDone = unit.lessons.map((l) => l.state).lastIndexOf("completed");
    return lastDone;
  })();
  const seg = (from: number, to: number) => {
    let d = "";
    for (let i = from; i < to; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const my = (y1 + y2) / 2;
      d += `${i === from ? `M${x1} ${y1}` : ""} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
    }
    return d;
  };
  const n = unit.lessons.length;

  return (
    <ol className="relative" style={{ height: n * ROW }}>
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 overflow-visible"
        width="1"
        height={n * ROW}
      >
        {reach < n - 1 && (
          <path
            d={seg(Math.max(0, reach), n - 1)}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.3"
            strokeWidth="1.5"
            strokeDasharray="1.5 6"
            strokeLinecap="round"
          />
        )}
        {reach > 0 && (
          <path
            d={seg(0, reach)}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        )}
      </svg>
      {unit.lessons.map((lesson, i) => {
        const [x, y] = points[i];
        return (
          <li
            key={lesson.id}
            className="absolute right-0 flex -translate-y-1/2 items-center"
            style={{
              top: y,
              // PathNode centres its stop in a 60px slot, so the stop's centre sits on the spine.
              left: x - 30,
              zIndex: openId === lesson.id ? 40 : undefined,
            }}
          >
            <PathNode
              lesson={lesson}
              open={openId === lesson.id}
              onToggle={() => onToggle(lesson.id)}
              onClose={onClose}
            />
          </li>
        );
      })}
    </ol>
  );
}

/** Small status disc for a guidebook row, matching the path node it describes. */
function GuideIcon({ lesson }: { lesson: PathLesson }) {
  const locked = lesson.state === "locked";
  return (
    <span
      role="img"
      aria-label={lesson.state === "completed" ? "Completed" : locked ? "Locked" : "Up next"}
      className={cn(
        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
        locked ? "bg-surface-2 text-muted" : "bg-brand text-white",
      )}
    >
      {lesson.kind === "checkpoint" ? (
        <TrophyIcon size={18} className={locked ? "opacity-45 grayscale" : undefined} />
      ) : locked ? (
        <Lock className="size-3.5" strokeWidth={2} />
      ) : lesson.state === "completed" ? (
        <Check className="size-4" strokeWidth={2.4} />
      ) : (
        <Play className="ml-px size-3.5 fill-current" strokeWidth={0} />
      )}
    </span>
  );
}
