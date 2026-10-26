"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { shuffledOrder } from "@/lib/rng";
import { formatNumber, parseLearnerNumber, withinTolerance } from "../_shared/numbers";
import { numericAnswerText, requiresUnit } from "./grade";
import type { Numeric, NumericResponse } from "./schema";
import { UnitPicker, type UnitState } from "./UnitPicker";
import { unitsMatch } from "./units";

const INVALID_DELAY_MS = 700;

export function NumericView({
  exercise,
  status,
  onChange,
  seed,
}: ExerciseProps<Numeric, NumericResponse>) {
  const locked = status !== "answering";
  const askUnit = requiresUnit(exercise);
  const units = useMemo(() => {
    if (!askUnit || exercise.unit === undefined) return [];
    const all = [exercise.unit, ...(exercise.unitChoices ?? [])];
    return shuffledOrder(all.length, seed).map((i) => all[i]);
  }, [askUnit, exercise, seed]);

  const [text, setText] = useState("");
  const [unit, setUnit] = useState<string | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);
  const hintId = useId();
  const unitHintId = useId();

  const parsed = parseLearnerNumber(text);
  const invalid = text.trim() !== "" && parsed === null;

  // Don't nag mid-keystroke ("3e", "-"): only flag invalid text after a pause.
  useEffect(() => {
    if (!invalid || locked) return;
    const timer = setTimeout(() => setShowInvalid(true), INVALID_DELAY_MS);
    return () => clearTimeout(timer);
  }, [invalid, locked, text]);

  const emit = (nextText: string, nextUnit: string | null) => {
    const value = parseLearnerNumber(nextText);
    if (value === null || (askUnit && nextUnit === null)) onChange(null);
    else onChange(askUnit && nextUnit !== null ? { value, unit: nextUnit } : { value });
  };

  const onType = (next: string) => {
    if (locked) return;
    setText(next);
    if (next.trim() === "" || parseLearnerNumber(next) !== null) setShowInvalid(false);
    emit(next, unit);
  };

  const onPickUnit = (next: string) => {
    if (locked) return;
    setUnit(next);
    emit(text, next);
  };

  const valueOk = parsed !== null && withinTolerance(parsed, exercise.answer, exercise.tolerance);
  const inputState = !locked ? "idle" : status === "correct" || valueOk ? "correct" : "wrong";

  const unitState = (u: string): UnitState => {
    const isAnswer = exercise.unit !== undefined && unitsMatch(u, exercise.unit);
    if (!locked) return u === unit ? "selected" : "idle";
    if (isAnswer) return "correct";
    if (u === unit) return "wrong";
    return "dimmed";
  };

  // Only teach e-notation where it's useful: huge/tiny answers or a prompt that uses powers of ten.
  const magnitude = Math.abs(exercise.answer);
  const showENotationTip =
    exercise.prompt.includes("10^{") || magnitude >= 1e5 || (magnitude > 0 && magnitude < 1e-3);

  const preview =
    parsed !== null && /[eE×xX*·^,]|\d\s+\d/.test(text.trim()) ? formatNumber(parsed) : null;

  return (
    <div className="grid max-w-[560px] gap-6">
      <div className="grid gap-2">
        <label
          className={cn(
            "flex h-20 items-center gap-3 rounded-2xl border-2 border-b-4 px-5 transition-colors duration-150",
            inputState === "idle" &&
              "border-line-strong bg-surface focus-within:border-brand focus-within:ring-brand/15 focus-within:ring-4",
            inputState === "correct" && "border-correct bg-correct-soft text-correct-ink",
            inputState === "wrong" && "animate-shake border-wrong bg-wrong-soft text-wrong-ink",
          )}
        >
          <span className="sr-only">Your answer</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={text}
            readOnly={locked}
            aria-invalid={invalid && showInvalid}
            aria-describedby={hintId}
            placeholder="Your answer"
            onChange={(e) => onType(e.target.value)}
            onBlur={() => invalid && setShowInvalid(true)}
            className={cn(
              "font-display placeholder:text-muted/70 h-full min-w-0 flex-1 bg-transparent text-4xl font-semibold tabular-nums outline-none! placeholder:text-2xl placeholder:font-medium",
              inputState === "idle" ? "text-ink" : "text-current",
            )}
          />
          {!askUnit && exercise.unit && (
            <RichText
              text={exercise.unit}
              className={cn(
                "font-display shrink-0 rounded-xl px-3 py-1 text-2xl font-semibold",
                inputState === "idle" ? "bg-surface-2 text-ink-soft" : "bg-surface/60 text-current",
              )}
            />
          )}
          {inputState === "correct" && (
            <Check className="size-7 shrink-0" strokeWidth={3.5} aria-hidden />
          )}
          {inputState === "wrong" && (
            <X className="size-7 shrink-0" strokeWidth={3.5} aria-hidden />
          )}
        </label>

        <p id={hintId} className="flex min-h-6 items-center gap-1.5 px-1 text-[15px] font-semibold">
          {locked && !valueOk ? (
            <span className="text-correct-ink">
              Answer: <RichText text={numericAnswerText(exercise)} />
            </span>
          ) : !locked && invalid && showInvalid ? (
            <span className="text-ink-soft flex items-center gap-1.5">
              <CircleAlert className="text-streak size-4" aria-hidden />
              That isn&apos;t a number yet — try 9.81, -0.5 or 3e8
            </span>
          ) : !locked && preview ? (
            <span className="text-muted">
              = <RichText text={preview} />
            </span>
          ) : !locked && showENotationTip ? (
            <span className="text-muted">
              Type <Kbd className="mx-0.5 h-5 text-[11px]">3e8</Kbd> for 3×10<sup>8</sup>
            </span>
          ) : null}
        </p>
      </div>

      {askUnit && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-ink text-lg font-semibold">Choose the unit</h2>
            {!locked && (
              <p
                id={unitHintId}
                className="text-muted flex items-center gap-1 text-xs font-semibold"
              >
                <Kbd className="h-5 text-[11px]">Tab</Kbd> then{" "}
                <Kbd className="h-5 text-[11px]">←</Kbd>
                <Kbd className="h-5 text-[11px]">→</Kbd> or <Kbd className="h-5 text-[11px]">1</Kbd>
                –<Kbd className="h-5 text-[11px]">{units.length}</Kbd>
              </p>
            )}
          </div>
          <UnitPicker
            units={units}
            value={unit}
            onPick={onPickUnit}
            stateFor={unitState}
            disabled={locked}
            describedBy={locked ? undefined : unitHintId}
          />
        </div>
      )}
    </div>
  );
}
