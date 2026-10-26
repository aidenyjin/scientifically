"use client";

import { CAST } from "@/characters/cast";
import { Character } from "@/characters/Character";
import type { CharacterId, Expression } from "@/characters/types";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";
import type { Side } from "./layout";

/** One chat line: avatar + speaker name on the first line of a run, then the bubble. */
export function Bubble({
  characterId,
  text,
  side,
  startsRun,
  expression,
}: {
  characterId: CharacterId;
  text: string;
  side: Side;
  startsRun: boolean;
  expression: Expression;
}) {
  const member = CAST[characterId];
  const right = side === "right";
  return (
    <li
      className={cn(
        "animate-rise-in flex items-end gap-3",
        right && "flex-row-reverse",
        !startsRun && "-mt-1.5",
      )}
    >
      <div className="w-16 shrink-0" aria-hidden={!startsRun}>
        {startsRun && <Character id={characterId} size={64} expression={expression} />}
      </div>
      <div className={cn("flex max-w-[82%] min-w-0 flex-col", right ? "items-end" : "items-start")}>
        {startsRun && (
          <span
            className="font-display mb-0.5 px-1 text-[13px] leading-tight font-semibold tracking-wide"
            // The character's colour, pulled towards ink so it reads in light and dark mode.
            style={{ color: `color-mix(in oklab, ${member.colors.dark} 70%, var(--ink))` }}
          >
            {member.name}
          </span>
        )}
        <div
          className={cn(
            "text-ink relative rounded-3xl border-2 px-4 py-2.5 text-[17px] leading-snug font-semibold",
            right ? "border-brand/25 bg-brand-soft" : "border-line bg-surface",
            startsRun && (right ? "rounded-br-lg" : "rounded-bl-lg"),
          )}
        >
          <span className="sr-only">{member.name}: </span>
          <RichText text={text} />
        </div>
      </div>
    </li>
  );
}
