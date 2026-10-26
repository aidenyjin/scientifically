"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export const MIN_COEFFICIENT = 1;
export const MAX_COEFFICIENT = 20;

const clamp = (n: number) => Math.min(MAX_COEFFICIENT, Math.max(MIN_COEFFICIENT, n));

export type BoxState = "idle" | "correct" | "wrong";

/**
 * A coefficient stepper. Type a digit (two quick digits make 10–20),
 * ArrowUp/ArrowDown step it, ArrowLeft/ArrowRight (or Tab) move between boxes.
 * The value is always a valid whole number from 1 to 20.
 */
export function CoefficientBox({
  value,
  onChange,
  onNavigate,
  register,
  label,
  size = "lg",
  locked,
  state,
  autoFocus,
}: {
  value: number;
  onChange: (value: number) => void;
  onNavigate: (delta: -1 | 1) => void;
  /** Receives the input element so the parent can move focus between boxes. */
  register: (el: HTMLInputElement | null) => void;
  label: string;
  size?: "lg" | "md";
  locked: boolean;
  state: BoxState;
  autoFocus?: boolean;
}) {
  // Digits typed since this box was focused, so "1" then "2" makes 12.
  const typed = useRef("");

  const set = (n: number) => {
    if (!locked && n !== value) onChange(clamp(n));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const { key } = event;
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      typed.current = "";
      set(value + (key === "ArrowUp" ? 1 : -1));
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      onNavigate(key === "ArrowLeft" ? -1 : 1);
    } else if (/^\d$/.test(key)) {
      event.preventDefault();
      const joined = typed.current + key;
      const next = typed.current.length === 1 && Number(joined) <= MAX_COEFFICIENT ? joined : key;
      if (Number(next) < MIN_COEFFICIENT) return; // a lone 0
      typed.current = next;
      set(Number(next));
    } else if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      const shorter = Math.floor(value / 10);
      typed.current = shorter >= MIN_COEFFICIENT ? String(shorter) : "";
      set(shorter >= MIN_COEFFICIENT ? shorter : MIN_COEFFICIENT);
    } else if (key.length === 1) {
      event.preventDefault(); // ignore letters and symbols
    }
  };

  const step = (delta: 1 | -1, input: HTMLInputElement | null) => {
    typed.current = "";
    set(value + delta);
    input?.focus();
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const stepperClass =
    "absolute left-1/2 z-10 grid h-5 w-10 -translate-x-1/2 place-items-center rounded-lg text-muted opacity-0 transition-opacity duration-150 group-hover/species:opacity-100 group-focus-within/species:opacity-100 hover:bg-surface-2 hover:text-brand disabled:invisible";

  return (
    <div className="relative flex">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${label}`}
        disabled={locked || value >= MAX_COEFFICIENT}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(1, inputRef.current)}
        className={cn(stepperClass, "-top-5")}
      >
        <ChevronUp className="size-4.5" strokeWidth={3} />
      </button>
      <input
        ref={(el) => {
          inputRef.current = el;
          register(el);
        }}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={MIN_COEFFICIENT}
        aria-valuemax={MAX_COEFFICIENT}
        autoComplete="off"
        autoFocus={autoFocus}
        readOnly={locked}
        value={String(value)}
        onKeyDown={locked ? undefined : onKeyDown}
        onFocus={() => {
          typed.current = "";
        }}
        onChange={(e) => {
          // Paste / IME fallback; normal typing is handled in onKeyDown.
          const n = parseInt(e.target.value.replace(/\D/g, "").slice(-2), 10);
          if (Number.isFinite(n)) set(n);
        }}
        className={cn(
          "font-display rounded-xl border-2 border-b-4 text-center font-semibold tabular-nums caret-transparent outline-none!",
          size === "lg" ? "h-14 w-12 text-3xl" : "h-12 w-11 text-[26px]",
          state === "idle" &&
            "border-line-strong bg-surface focus:border-brand focus:ring-brand/15 focus:ring-4",
          state === "idle" && (value === 1 ? "text-muted" : "text-brand-dark dark:text-brand"),
          state === "correct" && "border-correct bg-correct-soft text-correct-ink",
          state === "wrong" && "border-wrong bg-wrong-soft text-wrong-ink",
        )}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${label}`}
        disabled={locked || value <= MIN_COEFFICIENT}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => step(-1, inputRef.current)}
        className={cn(stepperClass, "-bottom-5")}
      >
        <ChevronDown className="size-4.5" strokeWidth={3} />
      </button>
    </div>
  );
}
