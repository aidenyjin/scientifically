"use client";

import { Check, X } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

/**
 * idle/selected while answering. After checking: "error" is the real mistake
 * (struck through), "found" is the real mistake when the learner picked it,
 * "wrongPick" is a correct segment the learner wrongly blamed.
 */
export type SegmentState = "idle" | "selected" | "error" | "found" | "wrongPick" | "dimmed";

const segmentClasses: Record<SegmentState, string> = {
  idle: "cursor-pointer bg-surface-2 text-ink shadow-[inset_0_-2px_0_var(--line-strong)] hover:bg-brand-soft/70",
  selected: "cursor-pointer bg-brand-soft text-brand-dark shadow-[inset_0_-3px_0_var(--brand)] dark:text-ink",
  error: "bg-wrong-soft text-wrong-ink shadow-[inset_0_-3px_0_var(--wrong)]",
  found: "bg-wrong-soft text-wrong-ink shadow-[inset_0_-3px_0_var(--wrong)]",
  wrongPick: "text-ink-soft shadow-[inset_0_-3px_0_var(--wrong)]",
  dimmed: "text-muted",
};

const kbdClasses: Partial<Record<SegmentState, string>> = {
  selected: "border-brand/40 text-brand",
  error: "border-wrong/40 text-wrong-ink",
};

/** One clickable chunk of a spot-the-error passage. Inline, so long chunks wrap like prose. */
export function Segment({
  text,
  shortcut,
  state,
  locked,
  onPick,
}: {
  text: string;
  shortcut: number;
  state: SegmentState;
  locked: boolean;
  onPick: () => void;
}) {
  const badge =
    state === "found" ? (
      <span className="inline-grid size-5 place-items-center rounded-md bg-correct align-[-3px] text-white">
        <Check className="size-3.5" strokeWidth={3.5} />
      </span>
    ) : state === "wrongPick" ? (
      <span className="inline-grid size-5 place-items-center rounded-md bg-wrong align-[-3px] text-white">
        <X className="size-3.5" strokeWidth={3.5} />
      </span>
    ) : (
      <Kbd className={cn("h-5 min-w-5 rounded-[5px] px-1 align-[2px] text-[11px]", kbdClasses[state])}>{shortcut}</Kbd>
    );

  return (
    <span
      role="radio"
      aria-checked={state === "selected" || state === "found" || state === "wrongPick"}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : 0}
      onClick={locked ? undefined : onPick}
      onKeyDown={(e) => {
        if (!locked && e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "rounded-lg px-1.5 py-1 box-decoration-clone transition-colors duration-150 select-none",
        segmentClasses[state],
      )}
    >
      <span className="mr-1.5">{badge}</span>
      {/* word joiner: never leave the number badge alone at the end of a line */}
      {"\u2060"}
      <RichText
        text={text}
        className={cn((state === "error" || state === "found") && "line-through decoration-wrong decoration-2")}
      />
    </span>
  );
}
