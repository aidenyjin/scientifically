"use client";

import { RichText } from "@/components/ui/RichText";
import type { ExerciseStatus } from "@/content/types";
import { cn } from "@/lib/cn";
import type { SimModel } from "@/sims/types";
import { formatOutputValue, outputOf } from "./format";
import type { Simulation } from "./schema";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Live output value + the goal, with a meter showing how close the learner is. */
export function GoalReadout({
  model,
  goal,
  outputs,
  status,
}: {
  model: SimModel;
  goal: Simulation["goal"];
  outputs: Record<string, number>;
  status: ExerciseStatus;
}) {
  const out = outputOf(model, goal.output);
  const value = outputs[goal.output];
  const unit = out?.unit ?? "";
  const diff = value - goal.target;
  const within = Math.abs(diff) <= goal.tolerance + 1e-9;
  // Half-width of the meter in output units: wide enough to show progress from afar.
  const span = Math.max(goal.tolerance * 5, Math.abs(goal.target) * 0.6);
  const pos = clamp(diff / span, -1, 1);
  const band = clamp(goal.tolerance / span, 0.02, 1) * 50; // % of the track each side
  const others = model.outputs.filter((o) => o.name !== goal.output);
  const fmt = (v: number) => formatOutputValue(v, goal.tolerance);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t-2 px-5 py-4 transition-colors duration-200",
        status === "answering" && "border-line bg-surface",
        status === "correct" && "border-correct/40 bg-correct-soft",
        status === "incorrect" && "border-wrong/40 bg-wrong-soft",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{out?.label ?? goal.output}</p>
        <p className="mt-0.5 font-display text-[32px] leading-none font-semibold text-ink tabular-nums" aria-live="polite">
          <RichText text={fmt(value)} />
          <span className="ml-1.5 text-lg text-muted">
            <RichText text={unit} />
          </span>
        </p>
        {others.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] font-bold text-muted">
            {others.map((o) => (
              <span key={o.name}>
                {o.label} <RichText text={`${fmt(outputs[o.name])} ${o.unit}`} className="text-ink-soft tabular-nums" />
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="w-full max-w-72 min-w-56 flex-1">
        <p className="flex items-baseline justify-between gap-3 text-sm font-bold">
          <span className="text-muted">Target</span>
          <span className="font-display text-base font-semibold text-ink tabular-nums">
            <RichText text={`${fmt(goal.target)} ${unit} ± ${fmt(goal.tolerance)}`} />
          </span>
        </p>
        <div
          className="relative mt-2 h-3 rounded-full bg-line"
          role="meter"
          aria-label={`Distance from target: ${fmt(Math.abs(diff))} ${unit} ${diff < 0 ? "below" : "above"}`}
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={Number(pos.toFixed(2))}
        >
          <div
            className="absolute inset-y-0 rounded-full bg-correct/45"
            style={{ left: `${50 - band}%`, width: `${band * 2}%` }}
          />
          <div className="absolute top-1/2 left-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-correct-dark/50" />
          <div
            className="absolute inset-0 transition-transform duration-150 ease-[var(--ease-out)]"
            style={{ transform: `translateX(${pos * 50}%)` }}
          >
            <div
              className={cn(
                "absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface transition-colors duration-150",
                within ? "bg-correct" : "bg-brand",
              )}
            />
          </div>
        </div>
        <p className="mt-1.5 flex justify-between text-[11px] font-extrabold tracking-wide text-muted uppercase">
          <span>Too low</span>
          <span className={cn("transition-colors duration-150", within ? "text-correct-ink" : "text-ink-soft")}>
            {within ? "On target" : <RichText text={`${fmt(Math.abs(diff))} ${unit} ${diff < 0 ? "short" : "over"}`} />}
          </span>
          <span>Too high</span>
        </p>
      </div>
    </div>
  );
}
