"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";
import { Fragment, useId, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { AnswerReveal } from "../_shared/AnswerReveal";
import { splitBlanks } from "../_shared/blanks";
import { markSlots } from "./grade";
import type { WordBank, WordBankResponse } from "./schema";
import { Tile, TileGhost, type TileState } from "./Tile";

const MOVE: Transition = { type: "tween", duration: 0.18, ease: [0.23, 1, 0.32, 1] };
const INSTANT: Transition = { duration: 0 };

export function WordBankView({ exercise, status, onChange, seed }: ExerciseProps<WordBank, WordBankResponse>) {
  const uid = useId();
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => splitBlanks(exercise.text), [exercise]);
  const bank = useMemo(() => {
    const all = [...exercise.answers, ...exercise.distractors];
    return shuffledOrder(all.length, seed).map((i) => all[i]);
  }, [exercise, seed]);
  const slotWidthCh = useMemo(
    () => Math.min(12, Math.max(4, ...bank.map((t) => richTextToPlain(t).length))),
    [bank],
  );

  /** Bank position placed in each slot, or null. */
  const [slots, setSlots] = useState<(number | null)[]>(() => exercise.answers.map(() => null));
  /** Slot indices in the order they were filled (Backspace undoes the latest). */
  const [history, setHistory] = useState<number[]>([]);
  const [instant, setInstant] = useState(false);
  const locked = status !== "answering";
  const used = new Set(slots.filter((p): p is number => p !== null));
  const nextSlot = slots.indexOf(null);
  const marks = locked ? markSlots(exercise, slots.map((p) => (p === null ? "" : bank[p]))) : null;

  const commit = (next: (number | null)[], nextHistory: number[], viaKeyboard: boolean) => {
    setSlots(next);
    setHistory(nextHistory);
    setInstant(viaKeyboard);
    const full = next.every((p) => p !== null);
    onChange(full ? { tiles: next.map((p) => bank[p ?? 0]) } : null);
  };

  const place = (position: number, viaKeyboard: boolean) => {
    if (locked || used.has(position) || nextSlot === -1) return;
    commit(
      slots.map((p, i) => (i === nextSlot ? position : p)),
      [...history, nextSlot],
      viaKeyboard,
    );
  };

  const remove = (slot: number, viaKeyboard: boolean) => {
    if (locked || slots[slot] === null) return;
    commit(
      slots.map((p, i) => (i === slot ? null : p)),
      history.filter((s) => s !== slot),
      viaKeyboard,
    );
  };

  useHotkeys(
    {
      ...digitKeys(bank.length, (i) => place(i, true)),
      Backspace: () => {
        const last = history.at(-1);
        if (last !== undefined) remove(last, true);
      },
    },
    { enabled: !locked },
  );

  const transition = instant || reduceMotion ? INSTANT : MOVE;
  const slotState = (i: number): TileState => (marks ? (marks[i] ? "correct" : "wrong") : "idle");

  return (
    <div className="grid gap-7">
      <div className="rounded-3xl border-2 border-line bg-surface px-7 py-5 text-[22px] leading-[2.7] font-semibold text-ink shadow-card">
        {pieces.map((piece, i) => {
          const position = slots[i];
          return (
            <Fragment key={i}>
              <RichText text={piece} />
              {i < slots.length && (
                <span className="mx-0.5 inline-flex items-center gap-1.5 align-baseline">
                  {position === null || position === undefined ? (
                    <span
                      role="img"
                      aria-label={`Blank ${i + 1}, empty`}
                      style={{ width: `calc(${slotWidthCh}ch + 2rem)` }}
                      className={cn(
                        "inline-flex h-12 items-center rounded-2xl border-2 border-dashed font-display text-[19px] leading-none transition-colors duration-150",
                        i === nextSlot && !locked
                          ? "border-brand/60 bg-brand-soft/60"
                          : "border-line-strong bg-surface-2",
                      )}
                    >
                      {/* zero-width text gives the empty slot the same baseline as a tile */}
                      {"\u200b"}
                    </span>
                  ) : (
                    <motion.span
                      layoutId={`${uid}-tile-${position}`}
                      layout="position"
                      transition={transition}
                      className="relative z-20 inline-flex"
                    >
                      <Tile
                        text={bank[position]}
                        state={slotState(i)}
                        disabled={locked}
                        onClick={(kb) => remove(i, kb)}
                        label={`Blank ${i + 1}: ${richTextToPlain(bank[position])}. Click to remove.`}
                      />
                    </motion.span>
                  )}
                  {marks && !marks[i] && <AnswerReveal text={exercise.answers[i]} />}
                </span>
              )}
            </Fragment>
          );
        })}
      </div>

      <div role="group" aria-label="Word bank" className="flex flex-wrap justify-center gap-3">
        {bank.map((text, position) =>
          used.has(position) ? (
            <TileGhost key={position} text={text} shortcut={position + 1} />
          ) : (
            <motion.span
              key={position}
              layoutId={`${uid}-tile-${position}`}
              layout="position"
              transition={transition}
              className="relative z-10 inline-flex"
            >
              <Tile
                text={text}
                shortcut={position + 1}
                state={locked ? "dimmed" : "idle"}
                disabled={locked}
                onClick={(kb) => place(position, kb)}
                label={`${richTextToPlain(text)} (key ${position + 1})`}
              />
            </motion.span>
          ),
        )}
      </div>

      {!locked && (
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted">
          <Kbd>1</Kbd>–<Kbd>{Math.min(bank.length, 9)}</Kbd> add a word
          <span className="mx-1.5 text-line-strong">·</span>
          <Kbd>Backspace</Kbd> undo
        </p>
      )}
    </div>
  );
}
