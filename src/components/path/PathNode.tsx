"use client";

import { Check, Lock, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { TrophyIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { PathLesson } from "./types";

/** Node diameters (px). The current one is larger so it reads first. */
export const NODE_SIZE = { standard: 48, current: 60, checkpoint: 52 } as const;

/**
 * One lesson stop on the path, with its title beside it and an anchored
 * popover. The popover scales from the node (origin-aware) and closes on
 * Escape / outside click.
 */
export function PathNode({
  lesson,
  open,
  onToggle,
  onClose,
}: {
  lesson: PathLesson;
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
  const size = current ? NODE_SIZE.current : checkpoint ? NODE_SIZE.checkpoint : NODE_SIZE.standard;

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

  const status = checkpoint
    ? done
      ? "Review passed"
      : "Unit review"
    : done
      ? "Done"
      : current
        ? "Up next"
        : "Locked";

  return (
    <div
      ref={wrapRef}
      className="relative flex min-w-0 items-center gap-3"
      data-current={current || undefined}
    >
      {/* A fixed 60px slot, so every stop's centre lands on the path's spine. */}
      <div className="grid size-[60px] shrink-0 place-items-center">
        <div className="relative grid place-items-center" style={{ width: size, height: size }}>
          {current && (
            <span
              aria-hidden
              className="border-brand absolute inset-0 animate-[halo_2.6s_var(--ease-out)_infinite] rounded-full border-[1.5px]"
            />
          )}
          <button
            ref={buttonRef}
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${lesson.title}${locked ? " (locked)" : done ? " (completed)" : ""}`}
            className={cn(
              "relative grid size-full place-items-center transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.95]",
              checkpoint ? "rounded-[16px]" : "rounded-full",
              done && "bg-brand text-white",
              current &&
                "bg-brand text-white shadow-[0_0_0_4px_var(--surface),0_0_0_5.5px_var(--brand)]",
              locked && "bg-surface text-muted shadow-[inset_0_0_0_1.5px_var(--line-strong)]",
            )}
          >
            {checkpoint ? (
              <TrophyIcon size={24} className={cn(locked && "opacity-45 grayscale")} />
            ) : locked ? (
              <span className="font-mono text-[13px]">{lesson.number}</span>
            ) : done ? (
              <Check className="size-[18px]" strokeWidth={2.4} />
            ) : (
              <Play className="ml-0.5 size-[20px] fill-current" strokeWidth={0} />
            )}
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            "truncate",
            current ? "font-heading text-ink text-[22px] leading-tight" : "text-[15px]",
            done && "text-ink-soft",
            locked && "text-ink",
          )}
        >
          {lesson.title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[11px] tracking-[0.14em] uppercase",
            current ? "text-brand font-medium" : "text-muted",
          )}
        >
          {status}
        </p>
      </div>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={lesson.title}
          className="animate-pop-in shadow-pop border-line bg-surface absolute top-[calc(100%+12px)] left-0 z-20 w-[300px] origin-top-left rounded-2xl border p-5"
        >
          <p className="text-muted text-[11px] font-medium tracking-[0.14em] uppercase">
            {checkpoint ? "Unit review" : `Lesson ${lesson.number} of ${lesson.of}`}
          </p>
          <p className="font-heading mt-1.5 text-[24px] leading-tight">{lesson.title}</p>
          {!locked && lesson.objectives.length > 0 && (
            <ul className="text-ink-soft mt-3 grid gap-1 text-sm">
              {lesson.objectives.slice(0, 3).map((o) => (
                <li key={o} className="flex gap-2">
                  <span
                    aria-hidden
                    className="bg-line-strong mt-[7px] size-1.5 shrink-0 rounded-full"
                  />
                  {o}
                </li>
              ))}
            </ul>
          )}
          {locked ? (
            <p className="text-muted mt-3 flex items-center gap-2 text-sm">
              <Lock className="size-4" strokeWidth={1.8} /> Finish the lessons before this one to
              unlock it.
            </p>
          ) : (
            <Link
              href={`/lesson/${lesson.id}`}
              className={buttonClassName({
                block: true,
                variant: done ? "secondary" : "primary",
                className: "mt-5",
              })}
            >
              {done
                ? "Practise again · +5 XP"
                : checkpoint
                  ? "Start review"
                  : "Start lesson · +10 XP"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
