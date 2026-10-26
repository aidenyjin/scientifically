"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import { useHotkeys } from "@/lib/keyboard";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import type { TrueFalse, TrueFalseResponse } from "./schema";

export function TrueFalseView({
  exercise,
  status,
  onChange,
}: ExerciseProps<TrueFalse, TrueFalseResponse>) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const locked = status !== "answering";

  const pick = (value: boolean) => {
    if (locked) return;
    setSelected(value);
    onChange({ value });
  };

  useHotkeys(
    { "1": () => pick(true), "2": () => pick(false), t: () => pick(true), f: () => pick(false) },
    { enabled: !locked },
  );

  const stateFor = (value: boolean): ChoiceState => {
    if (!locked) return selected === value ? "selected" : "idle";
    if (value === exercise.answer) return "correct";
    if (value === selected) return "wrong";
    return "dimmed";
  };

  return (
    <div className="grid gap-6">
      <blockquote className="rounded-3xl border-2 border-line bg-surface px-6 py-7 text-center font-display text-2xl leading-snug font-medium text-ink shadow-card">
        <RichText text={exercise.statement} />
      </blockquote>
      <div role="radiogroup" aria-label="True or false" className="grid grid-cols-2 gap-3">
        {([true, false] as const).map((value, i) => (
          <ChoiceOption
            key={String(value)}
            shortcut={i + 1}
            state={stateFor(value)}
            disabled={locked}
            onClick={() => pick(value)}
            className="justify-center py-5"
          >
            <span className="flex items-center justify-center gap-2 text-lg">
              {value ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
              {value ? "True" : "False"}
            </span>
          </ChoiceOption>
        ))}
      </div>
    </div>
  );
}
