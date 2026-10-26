"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { AnswerReveal } from "../_shared/AnswerReveal";

export type BlankState = "answering" | "correct" | "typo" | "wrong";

const inputClasses: Record<BlankState, string> = {
  answering:
    "border-line-strong bg-surface-2 text-ink focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/20 focus:outline-none focus-visible:outline-none",
  correct: "border-correct bg-correct-soft text-correct-ink",
  typo: "border-correct bg-correct-soft text-correct-ink",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink line-through decoration-2 animate-shake",
};

/** One inline text box in a fill-in-the-blank sentence, plus the right answer after a miss. */
export const BlankInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    state: BlankState;
    /** Width in characters (the longest accepted answer). */
    widthCh: number;
    /** Shown beside the box when wrong (or misspelt). */
    answer: string;
    label: string;
  }
>(function BlankInput({ value, onChange, state, widthCh, answer, label }, ref) {
  const locked = state !== "answering";
  return (
    <span className="inline-flex max-w-full items-center gap-2 align-middle">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={locked}
        aria-label={label}
        aria-invalid={state === "wrong" || undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        style={{ width: `calc(${widthCh + 1}ch + 1.75rem)` }}
        className={cn(
          "h-11 max-w-full rounded-xl border-2 border-b-4 px-3 text-center font-display text-[20px] font-semibold transition-colors duration-150",
          inputClasses[state],
          locked && "cursor-default",
        )}
      />
      {(state === "wrong" || state === "typo") && (
        <AnswerReveal
          text={answer}
          subtle={state === "typo"}
          label={state === "wrong" ? "Correct answer:" : "Correct spelling:"}
        />
      )}
    </span>
  );
});
