"use client";

import { Check, GripVertical, type LucideIcon } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

export type CardState = "idle" | "selected" | "correct" | "wrong";

const faces: Record<CardState, string> = {
  idle: "border-line bg-surface text-ink [--edge:var(--line-strong)]",
  selected: "border-brand bg-brand-soft text-brand-dark [--edge:var(--brand)] dark:text-ink",
  correct: "border-correct bg-correct-soft text-correct-ink [--edge:var(--correct)]",
  wrong: "border-wrong bg-wrong-soft text-wrong-ink [--edge:var(--wrong)]",
};

// `!` because cn() doesn't merge classes, so these must beat Kbd's own border/text colours.
const kbdTone: Record<CardState, string> = {
  idle: "",
  selected: "border-brand/40! text-brand!",
  correct: "border-correct/40! text-correct-ink!",
  wrong: "border-wrong/40! text-wrong-ink!",
};

/** Face of one ordering card. The draggable wrapper (Reorder.Item) lives in Component.tsx. */
export function OrderCard({
  text,
  position,
  state,
  lifted,
  correctPosition,
  interactive,
  compact,
}: {
  text: string;
  /** Current slot, 0-based. Shown as the card's number and its shortcut key. */
  position: number;
  state: CardState;
  /** True while dragged: shows the lifted shadow. */
  lifted: boolean;
  correctPosition: number;
  interactive: boolean;
  /** Tighter padding for long lists (6–7 cards) so the list fits a laptop screen. */
  compact: boolean;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl shadow-pop transition-opacity duration-200 ease-[var(--ease-out)]",
          lifted ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-2xl border-2 px-4 font-semibold shadow-[0_4px_0_var(--edge)] transition-colors duration-150",
          compact ? "py-2.5 text-base" : "py-3.5 text-[17px]",
          faces[state],
          interactive && state === "idle" && "group-hover:bg-surface-2",
        )}
      >
        <Kbd className={cn("shrink-0", kbdTone[state])}>{position + 1}</Kbd>
        <RichText text={text} className="min-w-0 flex-1" />
        {state === "selected" && (
          <span className="flex shrink-0 gap-1" aria-hidden>
            <Kbd className={kbdTone.selected}>↑</Kbd>
            <Kbd className={kbdTone.selected}>↓</Kbd>
          </span>
        )}
        {state === "idle" && interactive && <GripVertical aria-hidden className="size-5 shrink-0 text-muted" />}
        {state === "correct" && <Check aria-label="In the right place" className="size-5 shrink-0" strokeWidth={3} />}
        {state === "wrong" && (
          <span className="shrink-0 rounded-lg bg-surface px-2 py-0.5 text-sm font-bold text-wrong-ink">
            <span className="sr-only">Wrong place. </span>Goes #{correctPosition + 1}
          </span>
        )}
        {state === "selected" && <span className="sr-only">, selected. Use the up and down arrows to move it.</span>}
      </div>
    </>
  );
}

/** "↑ Smallest ———" label at the top or bottom end of the list. */
export function EndLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 px-1 font-display text-sm font-semibold tracking-wide text-muted uppercase">
      <Icon aria-hidden className="size-4" strokeWidth={2.5} />
      <span>{text}</span>
      <span aria-hidden className="h-0.5 flex-1 rounded-full bg-line" />
    </div>
  );
}
