"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AtomRow } from "./formula";

/** Live element | left | right table. Updates on every keypress, so no animation. */
export function AtomCounter({
  rows,
  id,
  className,
}: {
  rows: AtomRow[];
  id?: string;
  className?: string;
}) {
  const balanced = rows.filter((r) => r.left === r.right).length;
  return (
    <div
      id={id}
      className={cn(
        "border-line bg-surface w-full max-w-[300px] overflow-hidden rounded-2xl border-2",
        className,
      )}
    >
      <table className="w-full text-left">
        <caption className="sr-only">
          Atom counter: {balanced} of {rows.length} elements balanced
        </caption>
        <thead>
          <tr className="bg-surface-2 text-muted text-[11px] font-bold tracking-wide uppercase">
            <th scope="col" className="py-1.5 pl-4">
              Element
            </th>
            <th scope="col" className="py-1.5 text-center">
              Left
            </th>
            <th scope="col" className="py-1.5 text-center">
              Right
            </th>
            <th scope="col" className="w-12 py-1.5 pr-4">
              <span className="sr-only">Balanced?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const equal = row.left === row.right;
            return (
              <tr
                key={row.element}
                className={cn("border-line border-t-2", equal && "bg-correct-soft/60")}
              >
                <th
                  scope="row"
                  className="font-display text-ink py-1.5 pl-4 text-[17px] font-semibold"
                >
                  {row.element}
                </th>
                <td className="font-display text-ink-soft py-1.5 text-center text-[17px] font-semibold tabular-nums">
                  {row.left}
                </td>
                <td className="font-display text-ink-soft py-1.5 text-center text-[17px] font-semibold tabular-nums">
                  {row.right}
                </td>
                <td className="py-1.5 pr-4 text-right">
                  {equal ? (
                    <span className="bg-correct inline-grid size-5.5 place-items-center rounded-full text-white">
                      <Check className="size-3.5" strokeWidth={4} aria-label="balanced" />
                    </span>
                  ) : (
                    <span className="font-display text-muted inline-grid size-6 place-items-center text-lg font-semibold">
                      ≠<span className="sr-only">not balanced</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
