"use client";

import { Check, Lock, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { TrophyIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { PathLesson } from "./types";

/**
 * One circular lesson node with its anchored popover. The popover scales
 * from the node (origin-aware), and closes on Escape / outside click.
 */
export function PathNode({
  lesson,
  color,
  open,
  onToggle,
  onClose,
}: {
  lesson: PathLesson;
  color: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const locked = lesson.state === "locked";
  const current = lesson.state === "current";
  const done = lesson.state === "completed";
  const checkpoint = lesson.kind === "checkpoint";
  const size = checkpoint ? 84 : 72;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const face = locked ? "var(--line)" : color;
  const edge = locked ? "var(--line-strong)" : `color-mix(in oklab, ${color} 70%, black)`;

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center" data-current={current || undefined}>
      {current && !open && (
        <div className="absolute -top-12 z-10 animate-[bob_2.4s_ease-in-out_infinite]">
          <div
            className="relative rounded-xl border-2 border-line bg-surface px-3 py-1.5 font-display text-sm font-bold tracking-wide uppercase shadow-card"
            style={{ color }}
          >
            {lesson.number === 1 && !checkpoint ? "Start" : "Next"}
            <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line bg-surface" />
          </div>
        </div>
      )}

      <div className="relative" style={{ width: size, height: size }}>
        {current && (
          <span
            aria-hidden
            className="absolute -inset-2.5 rounded-full border-[6px] opacity-25"
            style={{ borderColor: color }}
          />
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${lesson.title}${locked ? " (locked)" : done ? " (completed)" : ""}`}
          className="pressable relative grid size-full place-items-center rounded-full [--depth:7px]"
          style={{ background: face, ["--edge" as string]: edge }}
        >
          <span aria-hidden className="absolute top-[14%] left-[22%] h-[18%] w-[30%] -rotate-[30deg] rounded-full bg-white/25" />
          {checkpoint ? (
            <TrophyIcon size={40} className={cn(locked && "opacity-40 grayscale")} />
          ) : locked ? (
            <Lock className="size-7 text-muted" strokeWidth={3} />
          ) : done ? (
            <Check className="size-9 text-white" strokeWidth={4} />
          ) : (
            <Star className="size-8 fill-white text-white" strokeWidth={2} />
          )}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label={lesson.title}
          className="absolute top-[calc(100%+14px)] z-20 w-[300px] origin-top animate-pop-in rounded-2xl p-4 shadow-pop"
          style={{ background: locked ? "var(--surface)" : color, border: locked ? "2px solid var(--line)" : undefined }}
        >
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45"
            style={{ background: locked ? "var(--surface)" : color, borderLeft: locked ? "2px solid var(--line)" : undefined, borderTop: locked ? "2px solid var(--line)" : undefined }}
          />
          <div className={cn("relative", locked ? "text-ink" : "text-white")}>
            <p className="font-display text-lg font-semibold">{lesson.title}</p>
            <p className={cn("text-sm font-bold", locked ? "text-muted" : "text-white/80")}>
              {checkpoint ? "Unit checkpoint" : `Lesson ${lesson.number} of ${lesson.of}`}
            </p>
            {!locked && lesson.objectives.length > 0 && (
              <ul className="mt-2 grid gap-0.5 text-sm font-semibold text-white/90">
                {lesson.objectives.slice(0, 3).map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
            )}
            {locked ? (
              <p className="mt-3 text-sm font-semibold text-muted">Complete the lessons before this to unlock it.</p>
            ) : (
              <Link
                href={`/lesson/${lesson.id}`}
                autoFocus
                className={buttonClassName({
                  block: true,
                  variant: "secondary",
                  className: "mt-4 border-0 bg-white [--edge:rgba(0,0,0,0.15)] hover:bg-white",
                })}
                style={{ color }}
              >
                {done ? "Practice again · +5 XP" : checkpoint ? "Start checkpoint" : "Start · +10 XP"}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
