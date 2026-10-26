"use client";

import { useMemo, useState } from "react";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import { SERIES_COLORS } from "./chartData";
import { GraphChart, SeriesMarker } from "./GraphChart";
import { NumberAnswer } from "./NumberAnswer";
import type { GraphRead, GraphReadResponse } from "./schema";

export function GraphReadView({ exercise, status, onChange, seed }: ExerciseProps<GraphRead, GraphReadResponse>) {
  const { chart, question } = exercise;
  return (
    <div className="grid gap-6">
      <figure className="rounded-3xl border-2 border-line bg-surface px-3 pt-4 pb-2 shadow-card">
        {(chart.title || chart.series.length > 1) && (
          <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3">
            {chart.title ? (
              <span className="font-display text-lg font-semibold text-ink">
                <RichText text={chart.title} />
              </span>
            ) : (
              <span />
            )}
            {chart.series.length > 1 && <Legend names={chart.series.map((s) => s.name)} markers={chart.kind === "scatter"} />}
          </figcaption>
        )}
        <GraphChart chart={chart} reveal={status !== "answering"} />
      </figure>

      {question.mode === "choice" ? (
        <ChoiceQuestion
          options={question.options}
          answerIndex={question.answerIndex}
          status={status}
          seed={seed}
          onPick={(index) => onChange({ mode: "choice", index })}
        />
      ) : (
        <NumberAnswer
          unit={question.unit}
          status={status}
          onValue={(value) => onChange(value === null ? null : { mode: "numeric", value })}
        />
      )}
    </div>
  );
}

function Legend({ names, markers }: { names: string[]; markers: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
      {names.map((name, i) => (
        <li key={name} className="flex items-center gap-1.5 text-sm font-bold text-ink-soft">
          {markers ? (
            <svg aria-hidden viewBox="0 0 20 20" className="size-4">
              <SeriesMarker index={i} cx={10} cy={10} />
            </svg>
          ) : (
            <span aria-hidden className="h-2.5 w-4 rounded-full" style={{ background: SERIES_COLORS[i] }} />
          )}
          {name}
        </li>
      ))}
    </ul>
  );
}

function ChoiceQuestion({
  options,
  answerIndex,
  status,
  seed,
  onPick,
}: {
  options: string[];
  answerIndex: number;
  status: ExerciseProps<GraphRead, GraphReadResponse>["status"];
  seed: number;
  onPick(index: number): void;
}) {
  const order = useMemo(() => shuffledOrder(options.length, seed), [options.length, seed]);
  const [selected, setSelected] = useState<number | null>(null);
  const locked = status !== "answering";
  const twoColumns = options.length % 2 === 0 && options.every((o) => o.length <= 48);

  const pick = (originalIndex: number) => {
    if (locked) return;
    setSelected(originalIndex);
    onPick(originalIndex);
  };

  useHotkeys(
    digitKeys(order.length, (i) => pick(order[i])),
    { enabled: !locked },
  );

  const stateFor = (originalIndex: number): ChoiceState => {
    if (!locked) return selected === originalIndex ? "selected" : "idle";
    if (originalIndex === answerIndex) return "correct";
    if (originalIndex === selected) return "wrong";
    return "dimmed";
  };

  return (
    <div role="radiogroup" aria-label="Answer options" className={cn("grid gap-3", twoColumns && "sm:grid-cols-2")}>
      {order.map((originalIndex, position) => (
        <ChoiceOption
          key={originalIndex}
          text={options[originalIndex]}
          shortcut={position + 1}
          state={stateFor(originalIndex)}
          disabled={locked}
          onClick={() => pick(originalIndex)}
        />
      ))}
    </div>
  );
}
