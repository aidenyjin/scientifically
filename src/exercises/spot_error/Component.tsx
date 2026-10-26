"use client";

import { Fragment, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { AnswerReveal } from "../_shared/AnswerReveal";
import type { SpotError, SpotErrorResponse } from "./schema";
import { Segment, type SegmentState } from "./Segment";

export function SpotErrorView({ exercise, status, onChange }: ExerciseProps<SpotError, SpotErrorResponse>) {
  const [selected, setSelected] = useState<number | null>(null);
  const locked = status !== "answering";
  const count = exercise.segments.length;

  const pick = (index: number) => {
    if (locked) return;
    setSelected(index);
    onChange({ index });
  };

  useHotkeys(digitKeys(count, pick), { enabled: !locked });

  const stateFor = (index: number): SegmentState => {
    if (!locked) return selected === index ? "selected" : "idle";
    if (index === exercise.errorIndex) return selected === index ? "found" : "error";
    if (index === selected) return "wrongPick";
    return "dimmed";
  };

  return (
    <div className="grid gap-3">
      <div
        role="radiogroup"
        aria-label="Parts of the passage. Pick the one with the error."
        className="rounded-3xl border-2 border-line bg-surface px-7 py-6 text-[21px] leading-[2.3] font-semibold text-ink shadow-card"
      >
        {exercise.segments.map((segment, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <Segment
              text={segment}
              shortcut={i + 1}
              state={stateFor(i)}
              locked={locked}
              onPick={() => pick(i)}
            />
            {locked && i === exercise.errorIndex && (
              <>
                {" "}
                <AnswerReveal text={exercise.correction} label="Should say:" />
              </>
            )}
          </Fragment>
        ))}
      </div>
      {!locked && (
        <p className="flex items-center gap-1.5 px-1 text-sm font-semibold text-muted">
          <Kbd>1</Kbd>–<Kbd>{Math.min(count, 9)}</Kbd> or click the part that&apos;s wrong
        </p>
      )}
    </div>
  );
}
