"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Character } from "@/characters/Character";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { Modal } from "@/components/ui/Modal";
import { useHotkeys } from "@/lib/keyboard";
import { PathNode } from "./PathNode";
import type { PathUnit } from "./types";

/** Horizontal offsets (px) that make the path wind like a river. */
const WAVE = [0, 52, 84, 52, 0, -52, -84, -52];

export function CoursePath({ units, currentLessonId }: { units: PathUnit[]; currentLessonId: string | null }) {
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
    <div className="grid gap-14 pb-24">
      {units.map((unit) => (
        <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
          <header
            className="sticky top-4 z-30 flex items-center justify-between gap-4 rounded-2xl px-5 py-4 text-white shadow-[0_4px_0_var(--edge)]"
            style={{ background: unit.color, ["--edge" as string]: `color-mix(in oklab, ${unit.color} 72%, black)` }}
          >
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold tracking-wider text-white/80 uppercase">
                Unit {unit.index + 1} · {unit.completed}/{unit.lessons.length}
              </p>
              <h2 id={`unit-${unit.id}`} className="truncate font-display text-2xl font-semibold">
                {unit.title}
              </h2>
              <p className="truncate text-[15px] font-semibold text-white/85">{unit.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setGuide(unit)}
              className="pressable flex shrink-0 items-center gap-2 rounded-xl border-2 border-white/40 px-3 py-2 font-display text-sm font-semibold tracking-wide uppercase [--depth:3px] [--edge:rgba(0,0,0,0.18)] hover:bg-white/10"
            >
              <BookOpen className="size-5" /> Guidebook
            </button>
          </header>

          <ol className="relative mt-14 flex flex-col items-center gap-12">
            {unit.lessons.map((lesson, i) => {
              const offset = WAVE[i % WAVE.length];
              const mascotHere = i === 2 && unit.lessons.length > 3;
              return (
                <li key={lesson.id} className="relative" style={{ transform: `translateX(${offset}px)` }}>
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

      <Modal open={guide !== null} onClose={() => setGuide(null)} label="Unit guidebook" className="max-w-lg">
        {guide && (
          <div>
            <p className="font-display text-sm font-semibold tracking-wider uppercase" style={{ color: guide.color }}>
              Unit {guide.index + 1} guidebook
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{guide.title}</h2>
            <p className="mt-1 text-ink-soft">{guide.description}</p>
            <ol className="mt-5 grid max-h-[50vh] gap-3 overflow-y-auto pr-1">
              {guide.lessons.map((l) => (
                <li key={l.id} className="rounded-2xl border-2 border-line p-3">
                  <p className="font-bold">
                    {l.kind === "checkpoint" ? "🏆 " : ""}
                    {l.title}
                  </p>
                  <ul className="mt-1 text-sm text-ink-soft">
                    {l.objectives.map((o) => (
                      <li key={o}>• {o}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>
    </div>
  );
}
