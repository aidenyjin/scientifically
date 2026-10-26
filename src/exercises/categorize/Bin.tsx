"use client";

import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";

/**
 * A category column. The header is the accessible drop button; the whole
 * card is also clickable with the mouse while an item is waiting to be placed.
 */
export function Bin({
  index,
  label,
  count,
  canDrop,
  onDrop,
  children,
}: {
  index: number;
  label: string;
  count: number;
  canDrop: boolean;
  onDrop: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={canDrop ? onDrop : undefined}
      className={cn(
        "flex min-w-0 flex-col rounded-3xl border-2 border-line bg-surface shadow-card transition-colors duration-150",
        canDrop && "cursor-pointer hover:border-brand/50 hover:bg-brand-soft/40",
      )}
    >
      <button
        type="button"
        aria-disabled={!canDrop}
        aria-label={`${label}, ${count} ${count === 1 ? "item" : "items"}${canDrop ? `. Press ${index + 1} to put the item here` : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          if (canDrop) onDrop();
        }}
        className={cn(
          "flex items-center gap-2.5 rounded-t-[22px] border-b-2 border-line px-3.5 py-3 text-left",
          !canDrop && "cursor-default",
        )}
      >
        <Kbd className="shrink-0">{index + 1}</Kbd>
        <span className="min-w-0 flex-1 font-display text-[17px] leading-tight font-semibold text-ink">{label}</span>
        {count > 0 && <span className="shrink-0 text-sm font-bold text-muted">{count}</span>}
      </button>
      <div className="flex min-h-36 flex-1 flex-col gap-2 p-2.5">
        {children}
        {count === 0 && canDrop && (
          <span aria-hidden className="m-auto text-sm font-semibold text-muted">
            Drop here
          </span>
        )}
      </div>
    </div>
  );
}
