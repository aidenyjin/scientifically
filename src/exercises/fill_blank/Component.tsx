"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { splitBlanks } from "../_shared/blanks";
import { BlankInput, type BlankState } from "./BlankInput";
import { markBlanks } from "./grade";
import type { FillBlank, FillBlankResponse } from "./schema";

const MIN_WIDTH_CH = 5;

export function FillBlankView({ exercise, status, onChange }: ExerciseProps<FillBlank, FillBlankResponse>) {
  const pieces = useMemo(() => splitBlanks(exercise.text), [exercise]);
  const [values, setValues] = useState<string[]>(() => exercise.blanks.map(() => ""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const locked = status !== "answering";

  const widths = useMemo(
    () =>
      exercise.blanks.map((b) =>
        Math.max(MIN_WIDTH_CH, ...b.accepted.map((a) => richTextToPlain(a).length)),
      ),
    [exercise],
  );

  const marks = useMemo(() => (locked ? markBlanks(exercise, values) : null), [locked, exercise, values]);

  useEffect(() => {
    inputs.current[0]?.focus({ preventScroll: true });
  }, []);

  const update = (index: number, value: string) => {
    if (locked) return;
    const next = values.map((v, i) => (i === index ? value : v));
    setValues(next);
    onChange(next.every((v) => v.trim() !== "") ? { values: next } : null);
  };

  const stateFor = (index: number): BlankState => {
    const mark = marks?.[index];
    if (!mark) return "answering";
    if (!mark.correct) return "wrong";
    return mark.typoOf ? "typo" : "correct";
  };

  const count = exercise.blanks.length;

  return (
    <div className="grid gap-3">
      <div className="rounded-3xl border-2 border-line bg-surface px-7 py-6 text-[22px] leading-[2.4] font-semibold text-ink shadow-card">
        {pieces.map((piece, i) => (
          <Fragment key={i}>
            <RichText text={piece} />
            {i < count && (
              <BlankInput
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={values[i]}
                onChange={(v) => update(i, v)}
                state={stateFor(i)}
                widthCh={widths[i]}
                answer={marks?.[i]?.typoOf ?? exercise.blanks[i].accepted[0]}
                label={count > 1 ? `Blank ${i + 1} of ${count}` : "Your answer"}
              />
            )}
          </Fragment>
        ))}
      </div>
      {count > 1 && !locked && (
        <p className="flex items-center gap-1.5 px-1 text-sm font-semibold text-muted">
          <Kbd>Tab</Kbd> next blank
          <span className="mx-1.5 text-line-strong">·</span>
          <Kbd>Enter</Kbd> check
        </p>
      )}
    </div>
  );
}
