"use client";

import { Table2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { AtomCounter } from "./AtomCounter";
import { CoefficientBox, type BoxState } from "./CoefficientBox";
import { atomRows, FormulaError, type AtomRow } from "./formula";
import type { EquationBalance, EquationBalanceResponse } from "./schema";
import { equationLayout, Term } from "./Term";

function safeRows(ex: EquationBalance, coefficients: number[]): AtomRow[] {
  try {
    return atomRows(ex.reactants, ex.products, coefficients);
  } catch (err) {
    if (err instanceof FormulaError) return [];
    throw err;
  }
}

export function EquationBalanceView({
  exercise,
  status,
  onChange,
}: ExerciseProps<EquationBalance, EquationBalanceResponse>) {
  // Every coefficient starts at 1.
  const [values, setValues] = useState<number[]>(() =>
    [...exercise.reactants, ...exercise.products].map(() => 1),
  );
  const [counterOpen, setCounterOpen] = useState(exercise.difficulty <= 2);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const counterId = useId();
  const locked = status !== "answering";

  // The response is always valid: report it on mount and on every change.
  useEffect(() => {
    onChange({ coefficients: values });
  }, [values, onChange]);

  const rows = useMemo(() => safeRows(exercise, values), [exercise, values]);

  const setAt = (index: number, value: number) => {
    if (locked) return;
    setValues((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const boxState = (index: number): BoxState => {
    if (!locked) return "idle";
    if (status === "correct") return "correct";
    return values[index] === exercise.answer[index] ? "correct" : "wrong";
  };

  const species = [...exercise.reactants, ...exercise.products];
  const { size, breakAtArrow } = equationLayout(species);
  const arrowAfter = exercise.reactants.length - 1;

  const terms = species.map((formula, index) => (
    <Term
      key={index}
      formula={formula}
      size={size}
      trailing={index === arrowAfter ? "→" : index < species.length - 1 ? "+" : undefined}
      expected={
        status === "incorrect" && values[index] !== exercise.answer[index]
          ? exercise.answer[index]
          : undefined
      }
      box={
        <CoefficientBox
          value={values[index]}
          onChange={(v) => setAt(index, v)}
          onNavigate={(delta) => boxes.current[index + delta]?.focus()}
          register={(el) => {
            boxes.current[index] = el;
          }}
          label={`Coefficient for ${formula}`}
          size={size}
          locked={locked}
          state={boxState(index)}
          autoFocus={index === 0}
        />
      }
    />
  ));
  // Long equations wrap after the arrow, like in a textbook.
  const lines = breakAtArrow
    ? [terms.slice(0, arrowAfter + 1), terms.slice(arrowAfter + 1)]
    : [terms];

  return (
    <div className="grid gap-5">
      <div
        role="group"
        aria-label="Equation"
        className={cn(
          "bg-surface shadow-card flex flex-col items-center gap-y-8 rounded-3xl border-2 px-6 py-8",
          status === "answering" && "border-line",
          status === "correct" && "border-correct",
          status === "incorrect" && "animate-shake border-wrong",
        )}
      >
        {lines.map((line, i) => (
          <div key={i} className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-8">
            {line}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {!locked && (
            <p className="text-muted flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold">
              Type a number or <Kbd className="h-5 text-[11px]">↑</Kbd>
              <Kbd className="h-5 text-[11px]">↓</Kbd> to change ·{" "}
              <Kbd className="h-5 text-[11px]">Tab</Kbd> or
              <Kbd className="h-5 text-[11px]">←</Kbd>
              <Kbd className="h-5 text-[11px]">→</Kbd> next box
            </p>
          )}
          {exercise.difficulty > 2 && (
            <button
              type="button"
              aria-expanded={counterOpen}
              aria-controls={counterId}
              onClick={() => setCounterOpen((v) => !v)}
              className="text-brand hover:bg-brand-soft flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-colors duration-150"
            >
              <Table2 className="size-4" aria-hidden />
              {counterOpen ? "Hide atom counter" : "Show atom counter"}
            </button>
          )}
        </div>

        {counterOpen && rows.length > 0 && (
          <AtomCounter
            id={counterId}
            rows={rows}
            className={cn(exercise.difficulty > 2 && "animate-rise-in")}
          />
        )}
      </div>
    </div>
  );
}
