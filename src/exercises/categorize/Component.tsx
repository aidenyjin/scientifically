"use client";

import { CircleCheck } from "lucide-react";
import { LayoutGroup, useReducedMotion, type Transition } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { Bin } from "./Bin";
import { ItemChip, type ChipState } from "./ItemChip";
import { activeItem, cycleActive, isComplete, type Placement } from "./placement";
import type { Categorize, CategorizeResponse } from "./schema";

/** Mouse placements glide into the bin; keyboard ones (often rapid-fire) are instant. */
const GLIDE: Transition = { duration: 0.24, ease: [0.23, 1, 0.32, 1] };
const INSTANT: Transition = { duration: 0 };

export function CategorizeView({ exercise, status, onChange, seed }: ExerciseProps<Categorize, CategorizeResponse>) {
  const { categories, items } = exercise;
  const uid = useId();
  const trayOrder = useMemo(() => shuffledOrder(items.length, seed), [items.length, seed]);
  const [placement, setPlacement] = useState<Placement>(() => items.map(() => null));
  const [history, setHistory] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [viaKeys, setViaKeys] = useState(false);
  const reduceMotion = useReducedMotion();
  const locked = status !== "answering";
  const active = locked ? null : activeItem(trayOrder, placement, chosen);
  const transition = reduceMotion || viaKeys ? INSTANT : GLIDE;

  useEffect(() => {
    onChange(isComplete(placement) ? { assignments: [...placement] } : null);
  }, [placement, onChange]);

  const place = (bin: number, keys: boolean) => {
    if (active === null) return;
    setViaKeys(keys);
    setPlacement((p) => p.map((id, i) => (i === active ? categories[bin].id : id)));
    setHistory((h) => [...h, active]);
    setChosen(null);
  };

  const takeBack = (item: number, keys: boolean) => {
    if (locked || placement[item] === null) return;
    setViaKeys(keys);
    setPlacement((p) => p.map((id, i) => (i === item ? null : id)));
    setHistory((h) => h.filter((i) => i !== item));
    setChosen(item);
  };

  useHotkeys(
    {
      ...digitKeys(categories.length, (bin) => place(bin, true)),
      Backspace: () => history.length > 0 && takeBack(history[history.length - 1], true),
      ArrowLeft: () => setChosen(cycleActive(trayOrder, placement, active, -1)),
      ArrowRight: () => setChosen(cycleActive(trayOrder, placement, active, 1)),
    },
    { enabled: !locked },
  );

  const plain = (item: number) => richTextToPlain(items[item].text);
  const labelOf = (categoryId: string) => categories.find((c) => c.id === categoryId)?.label ?? categoryId;
  const checkedState = (item: number): ChipState => (placement[item] === items[item].categoryId ? "correct" : "wrong");
  const rightBinNote = (item: number) => `→ ${labelOf(items[item].categoryId)}`;
  const tray = trayOrder.filter((item) => placement[item] === null);

  return (
    <LayoutGroup id={uid}>
      <div className="grid gap-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
          {categories.map((category, bin) => {
            const members = history.filter((item) => placement[item] === category.id);
            return (
              <Bin
                key={category.id}
                index={bin}
                label={category.label}
                count={members.length}
                canDrop={active !== null}
                onDrop={() => place(bin, false)}
              >
                {members.map((item) => {
                  const state = locked ? checkedState(item) : "placed";
                  return (
                    <ItemChip
                      key={item}
                      layoutId={`${uid}-item-${item}`}
                      transition={transition}
                      text={items[item].text}
                      state={state}
                      note={state === "wrong" ? rightBinNote(item) : undefined}
                      label={
                        locked
                          ? `${plain(item)}: ${state === "correct" ? "correct" : `wrong, belongs in ${labelOf(items[item].categoryId)}`}`
                          : `${plain(item)} in ${category.label}. Click to put it back.`
                      }
                      fill
                      disabled={locked}
                      onClick={() => takeBack(item, false)}
                    />
                  );
                })}
              </Bin>
            );
          })}
        </div>

        {(!locked || tray.length > 0) && (
          <div className="grid gap-3">
            <p
              aria-live="polite"
              className="flex min-h-7 flex-wrap items-center justify-center gap-x-1.5 text-center text-[15px] font-semibold text-ink-soft"
            >
              {active !== null ? (
                <>
                  <span>
                    Where does <RichText text={items[active].text} className="font-bold text-ink" /> go?
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-muted">
                    <Kbd>1</Kbd>–<Kbd>{categories.length}</Kbd>
                  </span>
                </>
              ) : (
                !locked && <span className="sr-only">All sorted. Ready to check!</span>
              )}
            </p>
            <div className="flex min-h-[76px] flex-wrap content-center items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed border-line-strong/70 p-3.5">
              {tray.map((item) => {
                const state: ChipState = locked ? "wrong" : item === active ? "active" : "idle";
                return (
                  <ItemChip
                    key={item}
                    layoutId={`${uid}-item-${item}`}
                    transition={transition}
                    text={items[item].text}
                    state={state}
                    note={locked ? rightBinNote(item) : undefined}
                    label={locked ? `${plain(item)}: belongs in ${labelOf(items[item].categoryId)}` : plain(item)}
                    disabled={locked}
                    onClick={() => setChosen(item)}
                  />
                );
              })}
              {tray.length === 0 && (
                <span aria-hidden className="flex items-center gap-2 text-[15px] font-semibold text-muted">
                  <CircleCheck className="size-5 text-correct" strokeWidth={2.5} /> All sorted. Ready to check!
                </span>
              )}
            </div>
            {!locked && (
              <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm font-semibold text-muted">
                <Kbd>←</Kbd>
                <Kbd>→</Kbd> switch item · <Kbd>Backspace</Kbd> or click a placed item to undo
              </p>
            )}
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}
