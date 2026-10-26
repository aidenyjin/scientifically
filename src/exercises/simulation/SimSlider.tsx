"use client";

import type { CSSProperties } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";
import type { SimParam } from "@/sims/types";
import { formatNumber } from "../_shared/numbers";
import { toUnicodeText } from "../_shared/unicodeText";

export type SliderTone = "brand" | "correct" | "wrong";

const tones: Record<SliderTone, CSSProperties> = {
  brand: { "--accent": "var(--brand)", "--accent-edge": "var(--brand-dark)" } as CSSProperties,
  correct: { "--accent": "var(--correct)", "--accent-edge": "var(--correct-dark)" } as CSSProperties,
  wrong: { "--accent": "var(--wrong)", "--accent-edge": "var(--wrong-dark)" } as CSSProperties,
};

// Native range input: arrow keys, Home/End and PageUp/Down work for free.
const range = cn(
  "h-8 w-full cursor-pointer appearance-none bg-transparent outline-none! disabled:cursor-default",
  // track: filled up to the thumb
  "[&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full",
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--accent)_var(--fill),var(--line)_var(--fill))]",
  "[&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-line",
  "[&::-moz-range-progress]:h-3 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[var(--accent)]",
  // thumb: big, chunky, with the 3D edge
  "[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-[var(--accent)] [&::-webkit-slider-thumb]:bg-surface",
  "[&::-webkit-slider-thumb]:shadow-[0_3px_0_var(--accent-edge)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150",
  "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-[var(--accent)]",
  "[&::-moz-range-thumb]:bg-surface [&::-moz-range-thumb]:shadow-[0_3px_0_var(--accent-edge)]",
  "enabled:active:[&::-webkit-slider-thumb]:scale-110 enabled:active:[&::-moz-range-thumb]:scale-110",
  "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_3px_0_var(--accent-edge),0_0_0_6px_color-mix(in_oklab,var(--accent)_28%,transparent)]",
  "focus-visible:[&::-moz-range-thumb]:shadow-[0_3px_0_var(--accent-edge),0_0_0_6px_color-mix(in_oklab,var(--accent)_28%,transparent)]",
);

/** One labelled slider for an adjustable simulation param. Digits jump between sliders. */
export function SimSlider({
  id,
  param,
  value,
  shortcut,
  tone,
  disabled,
  onValue,
  onDigit,
}: {
  id: string;
  param: SimParam;
  value: number;
  shortcut: number;
  tone: SliderTone;
  disabled: boolean;
  onValue(value: number): void;
  /** A digit typed while this slider has focus (focus moves to that slider). */
  onDigit(digit: number): boolean;
}) {
  const fill = ((value - param.min) / (param.max - param.min)) * 100;
  const shown = formatNumber(value);

  return (
    <div className="rounded-2xl border-2 border-line bg-surface px-4 pt-3 pb-2" style={tones[tone]}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink-soft">
          <Kbd className="h-5 min-w-5 text-[11px]">{shortcut}</Kbd>
          {param.label}
        </label>
        <output htmlFor={id} className="font-display text-xl font-semibold text-ink tabular-nums">
          <RichText text={shown} />
          <span className={cn("text-base text-muted", !/^[°%]/.test(param.unit) && "ml-1")}>
            <RichText text={param.unit} />
          </span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${toUnicodeText(shown)} ${toUnicodeText(param.unit)}`}
        onChange={(e) => onValue(Number(e.target.value))}
        onKeyDown={(e) => {
          if (/^[1-9]$/.test(e.key) && onDigit(Number(e.key))) e.preventDefault();
        }}
        className={range}
        style={{ "--fill": `${fill}%` } as CSSProperties}
      />
      <div className="flex justify-between text-xs font-bold text-muted tabular-nums">
        <span>
          <RichText text={formatNumber(param.min)} />
        </span>
        <span>
          <RichText text={formatNumber(param.max)} />
        </span>
      </div>
    </div>
  );
}
