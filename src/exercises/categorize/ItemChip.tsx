"use client";

import { motion, type Transition } from "motion/react";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

export type ChipState = "idle" | "active" | "placed" | "correct" | "wrong";

const faces: Record<ChipState, string> = {
  idle: "border-line bg-surface text-ink [--edge:var(--line-strong)] hover:bg-surface-2",
  active: "border-brand bg-brand-soft text-brand-dark [--edge:var(--brand)] dark:text-ink",
  placed: "border-line bg-surface text-ink [--edge:var(--line-strong)] hover:bg-surface-2",
  correct: "border-correct bg-correct-soft text-correct-ink [--edge:var(--correct)]",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink [--edge:var(--wrong)]",
};

/**
 * One sortable item. The motion wrapper carries a shared layoutId so the chip
 * glides between the tray and a bin; the button inside keeps the CSS press.
 */
export function ItemChip({
  layoutId,
  transition,
  text,
  state,
  note,
  label,
  fill,
  disabled,
  onClick,
}: {
  layoutId: string;
  transition: Transition;
  text: string;
  state: ChipState;
  /** Small second line, e.g. "→ Mammals" on a wrong chip. */
  note?: string;
  label: string;
  /** Stretch to the container width (inside bins). */
  fill?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div layout="position" layoutId={layoutId} transition={{ layout: transition }} className={cn(fill && "w-full")}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={state === "active" || undefined}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={cn(
          "pressable rounded-2xl border-2 px-3.5 py-2 text-[16px] leading-snug font-bold [--depth:3px]",
          faces[state],
          fill ? "w-full text-left" : "text-center",
          disabled && "cursor-default",
        )}
      >
        <RichText text={text} />
        {note && <span className="mt-0.5 block text-[13px] font-bold opacity-90">{note}</span>}
      </button>
    </motion.div>
  );
}
