"use client";

import { useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseStatus } from "@/content/types";
import { cn } from "@/lib/cn";
import { parseLearnerNumber } from "../_shared/numbers";

/**
 * Number field for "read the value" questions. Reports the parsed number
 * (or null while empty/invalid). Enter is handled by the lesson player.
 */
export function NumberAnswer({
  unit,
  status,
  onValue,
}: {
  unit?: string;
  status: ExerciseStatus;
  onValue(value: number | null): void;
}) {
  const [text, setText] = useState("");
  const locked = status !== "answering";
  const invalid = text.trim() !== "" && parseLearnerNumber(text) === null;

  return (
    <div className="grid gap-2">
      <label className="flex flex-wrap items-center gap-3">
        <span className="sr-only">Your answer</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={text}
          disabled={locked}
          placeholder="Type a number"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            onValue(parseLearnerNumber(e.target.value));
          }}
          className={cn(
            "h-14 w-56 rounded-2xl border-2 bg-surface px-4 font-display text-2xl font-semibold text-ink tabular-nums",
            "transition-colors duration-150 placeholder:font-sans placeholder:text-base placeholder:font-semibold placeholder:text-muted",
            "outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/20 focus-visible:outline-none",
            status === "answering" && (invalid ? "border-streak" : "border-line"),
            status === "correct" && "border-correct bg-correct-soft text-correct-ink",
            status === "incorrect" && "animate-shake border-wrong bg-wrong-soft text-wrong-ink",
          )}
        />
        {unit && (
          <span className="font-display text-xl font-semibold text-ink-soft">
            <RichText text={unit} />
          </span>
        )}
      </label>
      <p className={cn("flex items-center gap-1.5 text-sm font-semibold text-muted", locked && "invisible")} aria-live="polite">
        {invalid ? (
          <span className="text-streak-dark">That doesn&apos;t look like a number yet.</span>
        ) : (
          <>
            Read the value off the graph, then press <Kbd>Enter</Kbd>
          </>
        )}
      </p>
    </div>
  );
}
