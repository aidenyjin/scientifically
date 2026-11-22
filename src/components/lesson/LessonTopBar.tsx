"use client";

import { X } from "lucide-react";
import { HeartIcon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

/** Above this many questions the dots get too dense; show a thin bar instead. */
const MAX_DOTS = 20;

/**
 * Close, progress and hearts. Progress is one dot per question: answered
 * dots fill in, and the current one stretches into a short bar (a width
 * transition, so it slides along as you go).
 */
export function LessonTopBar({
  progress,
  total,
  hearts,
  combo,
  onQuit,
}: {
  progress: number;
  /** Number of questions in the lesson. */
  total: number;
  hearts: number | null;
  combo: number;
  onQuit: () => void;
}) {
  const done = Math.min(total, Math.round(progress * total));
  return (
    <header className="mx-auto grid w-full max-w-[1040px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-8 pt-7 pb-2 [@media(max-height:840px)]:pt-4">
      <button
        type="button"
        onClick={onQuit}
        aria-label="Quit lesson (Esc)"
        className="text-ink-soft hover:bg-surface-2 hover:text-ink grid size-10 place-items-center justify-self-start rounded-xl transition-[background-color,color,transform] duration-150 active:scale-[0.94]"
      >
        <X className="size-5" strokeWidth={1.8} />
      </button>

      <div className="relative">
        {total <= MAX_DOTS ? (
          <div
            role="progressbar"
            aria-label="Lesson progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-valuetext={`${done} of ${total} done`}
            className="flex items-center gap-1.5"
          >
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "block h-2 rounded-full transition-[width,background-color] duration-[380ms] ease-[var(--ease-out)]",
                  i === done ? "bg-brand w-11" : "w-2",
                  i < done && "bg-brand",
                  i > done && "bg-line-strong",
                )}
              />
            ))}
          </div>
        ) : (
          <ProgressBar value={progress} label="Lesson progress" className="w-[320px]" />
        )}
        <span
          aria-live="polite"
          className={cn(
            "text-streak pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-xs whitespace-nowrap transition-[opacity,transform] duration-200 ease-[var(--ease-out)]",
            combo >= 3 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {combo >= 3 ? `${combo} in a row` : ""}
        </span>
      </div>

      <div
        className={cn(
          "bg-wrong-soft text-wrong-ink flex items-center gap-1.5 justify-self-end rounded-full px-3 py-1.5 font-mono text-[13px] font-medium",
          hearts === 0 && "bg-surface-2 text-muted",
        )}
        aria-label={hearts === null ? "Unlimited hearts" : `${hearts} hearts left`}
      >
        <HeartIcon size={16} muted={hearts === 0} />
        <span className="tabular-nums">{hearts === null ? "∞" : hearts}</span>
      </div>
    </header>
  );
}
