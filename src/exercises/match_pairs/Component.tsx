"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { RichText } from "@/components/ui/RichText";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys, type HotkeyMap } from "@/lib/keyboard";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import { columnOrders } from "./layout";
import type { MatchPairs, MatchPairsResponse } from "./schema";
import { useMatchGame, type Side } from "./useMatchGame";

const LETTERS = "abcdef";

export function MatchPairsView({
  exercise,
  status,
  onChange,
  onSubmit,
  seed,
}: ExerciseProps<MatchPairs, MatchPairsResponse>) {
  const { pairs } = exercise;
  const columns = useMemo(() => columnOrders(pairs.length, seed), [pairs.length, seed]);
  const locked = status !== "answering";

  const game = useMatchGame(pairs.length, (mistakes) => {
    onChange({ mistakes });
    onSubmit?.();
  });

  const describe = (left: number, right: number) =>
    `${richTextToPlain(pairs[left].left)} and ${richTextToPlain(pairs[right].right)}`;
  const pick = (side: Side, pair: number) => {
    if (!locked) game.pick(side, pair, describe);
  };

  const keys: HotkeyMap = digitKeys(pairs.length, (row) => pick("left", columns.left[row]));
  columns.right.forEach((pair, row) => {
    keys[LETTERS[row]] = () => pick("right", pair);
  });
  useHotkeys(keys, { enabled: !locked });

  const stateFor = (side: Side, pair: number): ChoiceState => {
    if (status === "correct") return "correct";
    if (game.matched.has(pair)) return game.flashing.has(pair) ? "correct" : "dimmed";
    if (locked) return "dimmed";
    if (game.wrong?.[side] === pair) return "wrong";
    return game.selected[side] === pair ? "selected" : "idle";
  };

  const renderColumn = (side: Side) => (
    <div
      role="radiogroup"
      aria-label={side === "left" ? "Left column" : "Right column"}
      className="grid grid-rows-subgrid gap-3"
      style={{ gridRow: `span ${pairs.length}` }}
    >
      {columns[side].map((pair, row) => {
        const state = stateFor(side, pair);
        const done = game.matched.has(pair);
        return (
          <div key={pair} className="grid animate-rise-in" style={{ animationDelay: `${row * 40}ms` }}>
            <ChoiceOption
              shortcut={side === "left" ? row + 1 : LETTERS[row].toUpperCase()}
              state={state}
              disabled={locked || done}
              onClick={() => pick(side, pair)}
              className="h-full"
            >
              <span className="flex items-center gap-2">
                <RichText text={pairs[pair][side]} className="min-w-0 flex-1" />
                {done && state === "dimmed" && <Check aria-label="Matched" className="size-4 shrink-0" strokeWidth={3} />}
              </span>
            </ChoiceOption>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3" style={{ gridTemplateRows: `repeat(${pairs.length}, auto)` }}>
      {renderColumn("left")}
      {renderColumn("right")}
      <p aria-live="polite" className="sr-only">
        {game.announcement}
      </p>
    </div>
  );
}
