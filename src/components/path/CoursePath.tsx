"use client";

import { BookOpen, Check, Lock, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Character } from "@/characters/Character";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { TrophyIcon } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { useHotkeys } from "@/lib/keyboard";
import { PathNode } from "./PathNode";
import type { PathLesson, PathUnit } from "./types";

/** Horizontal offsets (px) that make the path wind like a river. */
const WAVE = [0, 52, 84, 52, 0, -52, -84, -52];

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
  const close = useCallback(() => setOpenId(null), []);

  // Bring the current lesson into view on load.
  useEffect(() => {
    document.querySelector("[data-current]")?.scrollIntoView({ block: "center" });
  }, []);

  // Laptop shortcut: Enter starts the next lesson when nothing is open.
  useHotkeys(
    { Enter: () => currentLessonId && router.push(`/lesson/${currentLessonId}`) },
    { enabled: !openId && !guide && currentLessonId !== null },
  );

  return (
    <div className="grid gap-14 pb-60">
      {units.map((unit) => (
        <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
          {/* The sticky strip is page-coloured above and behind the banner so the path never peeks around it. */}
          <div className="bg-bg sticky top-0 z-30 -mt-4 pt-4">
            <header
              className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white shadow-[0_4px_0_var(--edge)]"
              style={{
                background: unit.color,
                ["--edge" as string]: `color-mix(in oklab, ${unit.color} 72%, black)`,
              }}
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold tracking-wider text-white/80 uppercase">
                  Unit {unit.index + 1} · {unit.completed}/{unit.lessons.length}
                </p>
                <h2 id={`unit-${unit.id}`} className="font-display truncate text-2xl font-semibold">
                  {unit.title}
                </h2>
                <p className="truncate text-[15px] font-semibold text-white/85">
                  {unit.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuide(unit)}
                className="pressable font-display flex shrink-0 items-center gap-2 rounded-xl border-2 border-white/40 px-3 py-2 text-sm font-semibold tracking-wide uppercase [--depth:3px] [--edge:rgba(0,0,0,0.18)] hover:bg-white/10"
              >
                <BookOpen className="size-5" /> Guidebook
              </button>
            </header>
          </div>

          <ol className="relative mt-14 flex flex-col items-center gap-12">
            {unit.lessons.map((lesson, i) => {
              const offset = WAVE[i % WAVE.length];
              const mascotHere = i === 2 && unit.lessons.length > 3;
              return (
                <li
                  key={lesson.id}
                  className="relative"
                  // Each node is its own stacking context (transform), so lift the one with an open
                  // popover above its siblings and the sticky unit banners (z-30).
                  style={{
                    transform: `translateX(${offset}px)`,
                    zIndex: openId === lesson.id ? 40 : undefined,
                  }}
                >
                  <PathNode
                    lesson={lesson}
                    color={unit.color}
                    open={openId === lesson.id}
                    onToggle={() => setOpenId((v) => (v === lesson.id ? null : lesson.id))}
                    onClose={close}
                  />
                  {mascotHere && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 -translate-y-1/2"
                      style={{ [offset >= 0 ? "right" : "left"]: "calc(100% + 72px)" }}
                    >
                      <Character
                        id={CHARACTER_IDS[unit.index % CHARACTER_IDS.length]}
                        expression={unit.completed === unit.lessons.length ? "celebrate" : "happy"}
                        size={128}
                        animate
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

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
              className="text-muted hover:bg-surface-2 hover:text-ink-soft absolute top-4 right-4 grid size-10 place-items-center rounded-xl transition-colors duration-150"
            >
              <X className="size-6" strokeWidth={2.6} />
            </button>
            <p
              className="font-display pr-10 text-sm font-semibold tracking-wider uppercase"
              style={{ color: `color-mix(in oklab, ${guide.color} 82%, var(--ink))` }}
            >
              Unit {guide.index + 1} guidebook · {guide.completed}/{guide.lessons.length} done
            </p>
            <h2 className="font-display mt-1 pr-10 text-2xl font-semibold">{guide.title}</h2>
            <p className="text-ink-soft mt-1">{guide.description}</p>
            <ol className="mt-5 -mr-2 grid max-h-[50vh] gap-3 overflow-y-auto pr-2">
              {guide.lessons.map((l) => (
                <li
                  key={l.id}
                  className="flex gap-3 rounded-2xl border-2 p-3"
                  style={{ borderColor: l.state === "current" ? guide.color : "var(--line)" }}
                >
                  <GuideIcon lesson={l} color={guide.color} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{l.title}</span>
                      <span className="text-muted shrink-0 text-xs font-bold uppercase">
                        {l.kind === "checkpoint" ? "Checkpoint" : `Lesson ${l.number}`}
                      </span>
                    </p>
                    <ul className="text-ink-soft mt-1 text-sm">
                      {l.objectives.map((o) => (
                        <li key={o}>• {o}</li>
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

/** Small status disc for a guidebook row, matching the path node it describes. */
function GuideIcon({ lesson, color }: { lesson: PathLesson; color: string }) {
  const locked = lesson.state === "locked";
  return (
    <span
      role="img"
      aria-label={lesson.state === "completed" ? "Completed" : locked ? "Locked" : "Up next"}
      className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full"
      style={{ background: locked ? "var(--line)" : color }}
    >
      {lesson.kind === "checkpoint" ? (
        <TrophyIcon size={20} className={locked ? "opacity-40 grayscale" : undefined} />
      ) : locked ? (
        <Lock className="text-muted size-4" strokeWidth={3} />
      ) : lesson.state === "completed" ? (
        <Check className="size-5 text-white" strokeWidth={4} />
      ) : (
        <Star className="size-4 fill-white text-white" strokeWidth={2} />
      )}
    </span>
  );
}
