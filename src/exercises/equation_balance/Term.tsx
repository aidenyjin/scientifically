"use client";

import type { ReactNode } from "react";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";
import { formulaToRichText } from "./formula";

export type EquationSize = "lg" | "md";

/**
 * Pick a type size from the total formula length, and whether to break the
 * line after the arrow (how textbooks wrap long equations).
 */
export function equationLayout(formulas: string[]): { size: EquationSize; breakAtArrow: boolean } {
  const chars = formulas.join("").length;
  return { size: chars <= 14 ? "lg" : "md", breakAtArrow: chars > 20 };
}

/**
 * One species: coefficient box, formula, then the sign that follows it, kept
 * together so a wrapped line ends in "+" or "→" rather than starting with one.
 */
export function Term({
  formula,
  size,
  box,
  expected,
  trailing,
}: {
  formula: string;
  size: EquationSize;
  box: ReactNode;
  /** The right coefficient, shown under a wrong box after checking. */
  expected?: number;
  trailing?: "+" | "→";
}) {
  return (
    <div className="group/species flex items-center gap-2">
      <div className="relative">
        {box}
        {expected !== undefined && (
          <span className="animate-rise-in font-display text-correct-ink absolute inset-x-0 -bottom-5.5 text-center text-sm font-semibold">
            {expected}
            <span className="sr-only"> is the right coefficient</span>
          </span>
        )}
      </div>
      <RichText
        text={formulaToRichText(formula)}
        className={cn(
          "font-display text-ink font-semibold whitespace-nowrap",
          size === "lg" ? "text-[34px]" : "text-[28px]",
        )}
      />
      {trailing && (
        <span
          className={cn(
            "font-display text-muted px-1.5 font-semibold select-none",
            size === "lg" ? "text-3xl" : "text-2xl",
          )}
        >
          {trailing}
          {trailing === "→" && <span className="sr-only"> makes </span>}
        </span>
      )}
    </div>
  );
}
