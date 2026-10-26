"use client";

import { X } from "lucide-react";
import { HeartIcon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

export function LessonTopBar({
  progress,
  hearts,
  combo,
  onQuit,
}: {
  progress: number;
  hearts: number | null;
  combo: number;
  onQuit: () => void;
}) {
  return (
    <header className="mx-auto flex w-full max-w-[1040px] items-center gap-5 px-8 pt-8 pb-2 [@media(max-height:840px)]:pt-5">
      <button
        type="button"
        onClick={onQuit}
        aria-label="Quit lesson (Esc)"
        className="grid size-10 place-items-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink-soft"
      >
        <X className="size-6" strokeWidth={2.75} />
      </button>
      <div className="relative flex-1">
        <ProgressBar value={progress} label="Lesson progress" height={18} />
        <span
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute -top-7 font-display text-sm font-semibold text-streak transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
            combo >= 3 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
          style={{ left: `calc(${Math.max(4, Math.min(90, progress * 100))}% - 2.5rem)` }}
        >
          {combo >= 3 ? `${combo} in a row` : ""}
        </span>
      </div>
      <div
        className="flex min-w-14 items-center justify-end gap-1.5 font-display text-lg font-bold text-heart"
        aria-label={hearts === null ? "Unlimited hearts" : `${hearts} hearts left`}
      >
        <HeartIcon size={28} muted={hearts === 0} />
        <span className={cn("tabular-nums", hearts === 0 && "text-muted")}>{hearts === null ? "∞" : hearts}</span>
      </div>
    </header>
  );
}
