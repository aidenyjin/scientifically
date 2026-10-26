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

/** Two answer columns when every option is short and they pair up evenly. */
const twoColumnOptions = (options: string[]) => options.length % 2 === 0 && options.every((o) => o.length <= 48);

/**
 * Chart height that keeps the answers above the lesson footer on a laptop
 * screen (1280×800): the viewport minus the lesson chrome (top bar, prompt,
 * footer: `--lesson-chrome`, set on the view), the chart caption and the
 * answer area, clamped to a readable range.
 */
function chartHeight(chart: GraphRead["chart"], question: GraphRead["question"]): string {
  const hasCaption = Boolean(chart.title) || chart.series.length > 1;
  let answer: number;
  if (question.mode === "choice") {
    const rows = twoColumnOptions(question.options) ? Math.ceil(question.options.length / 2) : question.options.length;
    answer = rows * 64 + (rows - 1) * 12;
  } else {
    answer = 86;
  }
  const reserve = answer + (hasCaption ? 36 : 0);
  return `clamp(170px, calc(100dvh - var(--lesson-chrome) - ${reserve}px), 290px)`;
}

export function GraphReadView({ exercise, status, onChange, seed }: ExerciseProps<GraphRead, GraphReadResponse>) {
  const { chart, question } = exercise;
  return (
    // The lesson layout is roomier above 840px tall, so it takes more of the screen there.
    <div className="grid gap-5 [--lesson-chrome:412px] [@media(min-height:841px)]:[--lesson-chrome:476px]">
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
        <GraphChart
          chart={chart}
          reveal={status !== "answering"}
          height={chartHeight(chart, question)}
          // Choice questions ask about trends, not exact values: fewer, roomier gridlines.
          maxYTicks={question.mode === "choice" ? 7 : 9}
        />
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
  const twoColumns = twoColumnOptions(options);

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
