"use client";

import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

export type TileState = "idle" | "correct" | "wrong" | "dimmed";

const tileClasses: Record<TileState, string> = {
  idle: "border-line bg-surface text-ink [--edge:var(--line-strong)] hover:bg-surface-2",
  correct: "border-correct bg-correct-soft text-correct-ink [--edge:var(--correct)]",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink [--edge:var(--wrong)] animate-shake",
  dimmed: "border-line bg-surface text-muted [--edge:var(--line)] opacity-60",
};

const kbdClass = "h-5 min-w-5 rounded-[5px] px-1 text-[11px] font-bold";

const base =
  "inline-flex h-12 items-center gap-2 rounded-2xl border-2 px-4 font-display text-[19px] leading-none font-medium whitespace-nowrap select-none";

/** A chunky word tile. In the bank it shows its digit shortcut. */
export function Tile({
  text,
  shortcut,
  state,
  disabled,
  onClick,
  label,
}: {
  text: string;
  shortcut?: number;
  state: TileState;
  disabled?: boolean;
  onClick: (viaKeyboard: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      // detail is 0 when activated from the keyboard (Space/Enter on a focused tile).
      onClick={(e) => onClick(e.detail === 0)}
      className={cn("pressable [--depth:4px]", base, tileClasses[state], disabled && "cursor-default")}
    >
      {shortcut !== undefined && (
        <Kbd className={kbdClass}>{shortcut}</Kbd>
      )}
      <RichText text={text} />
    </button>
  );
}

/** Same-size placeholder left in the bank where a used tile was, so nothing jumps. */
export function TileGhost({ text, shortcut }: { text: string; shortcut?: number }) {
  return (
    <span aria-hidden className={cn(base, "border-transparent bg-line/70")}>
      <span className="invisible contents">
        {shortcut !== undefined && <Kbd className={kbdClass}>{shortcut}</Kbd>}
        <RichText text={text} />
      </span>
    </span>
  );
}
