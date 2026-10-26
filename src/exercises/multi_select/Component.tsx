"use client";

import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import { Checkbox, type MultiOptionState } from "./Checkbox";
import type { MultiSelect, MultiSelectResponse } from "./schema";

/** A correct option the learner didn't tick: correct-coloured dashed outline. */
const MISSED_CLASSES =
  "border-dashed border-correct! bg-correct-soft/40! text-correct-ink! [--edge:var(--correct)]!";

export function MultiSelectView({
  exercise,
  status,
  onChange,
  seed,
}: ExerciseProps<MultiSelect, MultiSelectResponse>) {
  const order = useMemo(() => shuffledOrder(exercise.options.length, seed), [exercise, seed]);
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set());
  const locked = status !== "answering";
  const answers = useMemo(() => new Set(exercise.answerIndices), [exercise]);
  const twoColumns = exercise.options.every((o) => richTextToPlain(o).length <= 24);

  const toggle = (originalIndex: number) => {
    if (locked) return;
    const next = new Set(selected);
    if (next.has(originalIndex)) next.delete(originalIndex);
    else next.add(originalIndex);
    setSelected(next);
    onChange(next.size > 0 ? { indices: [...next].sort((a, b) => a - b) } : null);
  };

  useHotkeys(
    digitKeys(order.length, (i) => toggle(order[i])),
    { enabled: !locked },
  );

  const stateFor = (originalIndex: number): MultiOptionState => {
    const ticked = selected.has(originalIndex);
    if (!locked) return ticked ? "selected" : "idle";
    const isAnswer = answers.has(originalIndex);
    if (ticked) return isAnswer ? "correct" : "wrong";
    return isAnswer ? "missed" : "dimmed";
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between px-1 text-sm font-bold text-muted">
        <span className="flex items-center gap-1.5 font-display tracking-wide uppercase">
          <ListChecks className="size-4" strokeWidth={2.5} /> Select all that apply
        </span>
        <span aria-live="polite">{selected.size > 0 && !locked ? `${selected.size} selected` : ""}</span>
      </div>
      <div
        role="group"
        aria-label="Answer options. Select all that apply."
        className={cn("grid gap-3", twoColumns && "sm:grid-cols-2")}
      >
        {order.map((originalIndex, position) => {
          const state = stateFor(originalIndex);
          const choiceState: ChoiceState = state === "missed" ? "idle" : state;
          return (
            <ChoiceOption
              key={originalIndex}
              role="checkbox"
              shortcut={position + 1}
              state={choiceState}
              disabled={locked}
              onClick={() => toggle(originalIndex)}
              className={cn(state === "missed" && MISSED_CLASSES)}
            >
              <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <RichText text={exercise.options[originalIndex]} />
                  {state === "missed" && <span className="sr-only"> (correct answer you missed)</span>}
                </span>
                <Checkbox state={state} />
              </span>
            </ChoiceOption>
          );
        })}
      </div>
    </div>
  );
}
