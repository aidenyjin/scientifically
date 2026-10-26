"use client";

import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

export type ChoiceState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const stateClasses: Record<ChoiceState, string> = {
  idle: "border-line bg-surface text-ink [--edge:var(--line)] hover:bg-surface-2",
  selected: "border-brand bg-brand-soft text-brand-dark [--edge:var(--brand)] dark:text-ink",
  correct: "border-correct bg-correct-soft text-correct-ink [--edge:var(--correct)]",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink [--edge:var(--wrong)] animate-shake",
  dimmed: "border-line bg-surface text-muted [--edge:var(--line)] opacity-70",
};

/**
 * The standard answer card used by choice-style exercises. Shows the
 * keyboard shortcut on the left. Reuse this rather than styling new buttons.
 */
export function ChoiceOption({
  text,
  shortcut,
  state,
  disabled,
  onClick,
  role = "radio",
  className,
  children,
}: {
  text?: string;
  shortcut?: string | number;
  state: ChoiceState;
  disabled?: boolean;
  onClick?: () => void;
  role?: "radio" | "checkbox" | "button";
  className?: string;
  children?: React.ReactNode;
}) {
  const checked = state === "selected" || state === "correct" || (state === "wrong" && role !== "button");
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "button" ? undefined : checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "pressable flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-[17px] font-semibold [--depth:4px]",
        stateClasses[state],
        disabled && state === "idle" && "cursor-default hover:bg-surface",
        className,
      )}
    >
      {shortcut !== undefined && (
        <Kbd
          className={cn(
            "shrink-0",
            state === "selected" && "border-brand/40 text-brand",
            state === "correct" && "border-correct/40 text-correct-ink",
            state === "wrong" && "border-wrong/40 text-wrong-ink",
          )}
        >
          {shortcut}
        </Kbd>
      )}
      <span className="min-w-0 flex-1">{children ?? (text ? <RichText text={text} /> : null)}</span>
    </button>
  );
}
