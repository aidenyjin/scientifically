"use client";

import { useMemo, useState } from "react";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import type { MultipleChoice, MultipleChoiceResponse } from "./schema";

export function MultipleChoiceView({
  exercise,
  status,
  onChange,
  seed,
}: ExerciseProps<MultipleChoice, MultipleChoiceResponse>) {
  const order = useMemo(() => shuffledOrder(exercise.options.length, seed), [exercise, seed]);
  const [selected, setSelected] = useState<number | null>(null);
  const locked = status !== "answering";

  const pick = (originalIndex: number) => {
    if (locked) return;
    setSelected(originalIndex);
    onChange({ index: originalIndex });
  };

  useHotkeys(
    digitKeys(order.length, (i) => pick(order[i])),
    { enabled: !locked },
  );

  const stateFor = (originalIndex: number): ChoiceState => {
    if (!locked) return selected === originalIndex ? "selected" : "idle";
    if (originalIndex === exercise.answerIndex) return "correct";
    if (originalIndex === selected) return "wrong";
    return "dimmed";
  };

  return (
    <div role="radiogroup" aria-label="Answer options" className="grid gap-3">
      {order.map((originalIndex, position) => (
        <ChoiceOption
          key={originalIndex}
          text={exercise.options[originalIndex]}
          shortcut={position + 1}
          state={stateFor(originalIndex)}
          disabled={locked}
          onClick={() => pick(originalIndex)}
        />
      ))}
    </div>
  );
}
