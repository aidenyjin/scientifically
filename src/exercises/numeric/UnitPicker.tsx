"use client";

import { useRef, type KeyboardEvent } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

export type UnitState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const stateClasses: Record<UnitState, string> = {
  idle: "border-line bg-surface text-ink [--edge:var(--line)] hover:bg-surface-2",
  selected: "border-brand bg-brand-soft text-brand-dark [--edge:var(--brand)] dark:text-ink",
  correct: "border-correct bg-correct-soft text-correct-ink [--edge:var(--correct)]",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink [--edge:var(--wrong)] animate-shake",
  dimmed: "border-line bg-surface text-muted [--edge:var(--line)] opacity-70",
};

/**
 * Segmented radio group for choosing a unit. Keyboard: Tab in, then
 * ←/→ (or ↑/↓) to move, or 1–5 to jump. Digits only work while the group has
 * focus, so they never fight with typing the number.
 */
export function UnitPicker({
  units,
  value,
  onPick,
  stateFor,
  disabled,
  describedBy,
}: {
  units: string[];
  value: string | null;
  onPick: (unit: string) => void;
  stateFor: (unit: string) => UnitState;
  disabled: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = value === null ? -1 : units.indexOf(value);
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const choose = (i: number) => {
    onPick(units[i]);
    refs.current[i]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;
    const n = units.length;
    const from =
      selectedIndex === -1
        ? event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? 0
          : -1
        : selectedIndex;
    let target: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (from + 1) % n;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (from - 1 + n) % n;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = n - 1;
    else if (/^[1-9]$/.test(event.key) && Number(event.key) <= n) target = Number(event.key) - 1;
    if (target === null) return;
    event.preventDefault();
    choose(target);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Unit"
      aria-describedby={describedBy}
      onKeyDown={onKeyDown}
      className="group/units flex flex-wrap gap-2.5"
    >
      {units.map((unit, i) => {
        const state = stateFor(unit);
        return (
          <button
            key={unit}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={unit === value}
            tabIndex={i === focusIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => onPick(unit)}
            className={cn(
              "pressable font-display relative flex h-12 min-w-16 items-center justify-center gap-2 rounded-xl border-2 px-4 text-lg font-semibold [--depth:3px]",
              stateClasses[state],
              disabled && state === "idle" && "hover:bg-surface cursor-default",
            )}
          >
            <Kbd
              className={cn(
                "bg-surface absolute -top-2.5 -left-2 h-5 min-w-5 px-1 text-[11px] opacity-0 transition-opacity duration-150 group-focus-within/units:opacity-100",
                disabled && "hidden",
              )}
            >
              {i + 1}
            </Kbd>
            <RichText text={unit} />
          </button>
        );
      })}
    </div>
  );
}
