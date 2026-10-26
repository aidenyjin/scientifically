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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      buttonRef.current?.focus();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Move focus to the Start link (so Enter starts it) and keep the whole
  // popover on screen: scroll just enough to reveal it.
  useEffect(() => {
    if (!open || !popRef.current) return;
    popRef.current.querySelector("a")?.focus({ preventScroll: true });
    // offsetHeight ignores the pop-in scale, so this is the settled size.
    const bottom = popRef.current.getBoundingClientRect().top + popRef.current.offsetHeight;
    const overflow = bottom + 24 - window.innerHeight;
    if (overflow <= 0) return;
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.reduceMotion === "true";
    window.scrollBy({ top: overflow, behavior: reduce ? "auto" : "smooth" });
  }, [open]);

  const face = locked ? "var(--line)" : color;
  const edge = locked ? "var(--line-strong)" : `color-mix(in oklab, ${color} 70%, black)`;

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center"
      data-current={current || undefined}
    >
      {current && !open && (
        <div className="absolute -top-[46px] z-10 animate-[bob_2.4s_ease-in-out_infinite]">
          <div
            className="border-line bg-surface font-display shadow-card relative rounded-xl border-2 px-3 py-1.5 text-sm font-bold tracking-wide uppercase"
            style={{ color }}
          >
            {lesson.number === 1 && !checkpoint ? "Start" : "Next"}
            <span className="border-line bg-surface absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2" />
          </div>
        </div>
      )}

      <div className="relative" style={{ width: size, height: size }}>
        {current && (
          // Centred on the face *plus* its 7px 3D edge, so the ring looks even all round.
          <span
            aria-hidden
            className="absolute rounded-full border-[6px] opacity-25"
            style={{
              borderColor: color,
              top: -10,
              left: -13.5,
              width: size + 27,
              height: size + 27,
            }}
          />
        )}
        <button
          ref={buttonRef}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${lesson.title}${locked ? " (locked)" : done ? " (completed)" : ""}`}
          className="pressable relative grid size-full place-items-center rounded-full [--depth:7px]"
          style={{ background: face, ["--edge" as string]: edge }}
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-[14%] left-[22%] h-[18%] w-[30%] -rotate-[30deg] rounded-full",
              locked ? "bg-white/10" : "bg-white/25",
            )}
          />
          {checkpoint ? (
            <TrophyIcon size={40} className={cn(locked && "opacity-40 grayscale")} />
          ) : locked ? (
            <Lock className="text-muted size-7" strokeWidth={3} />
          ) : done ? (
            <Check className="size-9 text-white" strokeWidth={4} />
          ) : (
            <Star className="size-8 fill-white text-white" strokeWidth={2} />
          )}
        </button>
      </div>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={lesson.title}
          className="animate-pop-in shadow-pop absolute top-[calc(100%+14px)] z-20 w-[300px] origin-top rounded-2xl p-4"
          style={{
            background: locked ? "var(--surface)" : color,
            border: locked ? "2px solid var(--line)" : undefined,
          }}
        >
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45"
            style={{
              background: locked ? "var(--surface)" : color,
              borderLeft: locked ? "2px solid var(--line)" : undefined,
              borderTop: locked ? "2px solid var(--line)" : undefined,
            }}
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
              <p className="text-muted mt-3 text-sm font-semibold">
                Complete the lessons before this to unlock it.
              </p>
            ) : (
              <Link
                href={`/lesson/${lesson.id}`}
                className={buttonClassName({
                  block: true,
                  variant: "secondary",
                  className: "mt-4 border-0 bg-white [--edge:rgba(0,0,0,0.15)] hover:bg-white",
                })}
                style={{ color }}
              >
                {done
                  ? "Practice again · +5 XP"
                  : checkpoint
                    ? "Start checkpoint"
                    : "Start · +10 XP"}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
