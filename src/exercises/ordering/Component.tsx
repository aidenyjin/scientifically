"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Reorder, useReducedMotion, type Transition } from "motion/react";
import { useEffect, useState } from "react";
import { Kbd } from "@/components/ui/Kbd";
import { richTextToPlain } from "@/content/richtext";
import type { ExerciseProps } from "@/content/types";
import { cn } from "@/lib/cn";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { moveItem } from "./move";
import { EndLabel, OrderCard, type CardState } from "./OrderCard";
import type { Ordering, OrderingResponse } from "./schema";

/** Neighbours glide aside while dragging; keyboard moves snap almost instantly. */
const DRAG_LAYOUT: Transition = { type: "spring", stiffness: 700, damping: 48, mass: 0.7 };
const KEY_LAYOUT: Transition = { duration: 0.1, ease: [0.23, 1, 0.32, 1] };
const NO_LAYOUT: Transition = { duration: 0 };

export function OrderingView({ exercise, status, onChange, seed }: ExerciseProps<Ordering, OrderingResponse>) {
  const { items } = exercise;
  const [order, setOrder] = useState(() => shuffledOrder(items.length, seed));
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [viaKeys, setViaKeys] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const reduceMotion = useReducedMotion();
  const locked = status !== "answering";
  const compact = items.length >= 6;

  // Any arrangement is a valid answer, so Check is enabled from the start.
  useEffect(() => onChange({ order }), [order, onChange]);

  const toggle = (item: number) => {
    if (!locked) setSelected((current) => (current === item ? null : item));
  };

  const move = (delta: number) => {
    if (locked || selected === null) return;
    const from = order.indexOf(selected);
    const to = from + delta;
    if (to < 0 || to >= order.length) return;
    setViaKeys(true);
    setOrder(moveItem(order, from, to));
    setAnnouncement(`${richTextToPlain(items[selected])}: position ${to + 1} of ${order.length}`);
  };

  useHotkeys(
    {
      ...digitKeys(order.length, (position) => toggle(order[position])),
      ArrowUp: () => move(-1),
      ArrowDown: () => move(1),
    },
    { enabled: !locked },
  );

  const stateFor = (item: number, position: number): CardState => {
    if (locked) return item === position ? "correct" : "wrong";
    return selected === item ? "selected" : "idle";
  };

  const layoutTransition = reduceMotion ? NO_LAYOUT : viaKeys ? KEY_LAYOUT : DRAG_LAYOUT;

  return (
    <div className="grid gap-3">
      {exercise.startLabel && <EndLabel icon={ArrowUp} text={exercise.startLabel} />}
      <Reorder.Group
        as="ol"
        axis="y"
        values={order}
        onReorder={(next) => {
          setViaKeys(false);
          setOrder(next);
        }}
        aria-label="Cards to put in order"
        className={cn("grid", compact ? "gap-2" : "gap-3")}
      >
        {order.map((item, position) => (
          <Reorder.Item
            key={item}
            value={item}
            drag={locked ? false : "y"}
            tabIndex={locked ? -1 : 0}
            onClick={() => toggle(item)}
            onKeyDown={(event) => {
              // Space selects; this also stops motion's built-in grab-and-arrow mode.
              if (event.key !== " ") return;
              event.preventDefault();
              toggle(item);
            }}
            onDragStart={() => setDragging(item)}
            onDragEnd={() => setDragging(null)}
            whileDrag={reduceMotion ? undefined : { scale: 1.03 }}
            transition={{ layout: layoutTransition }}
            className={cn(
              "group relative list-none rounded-2xl select-none",
              !locked && "cursor-grab active:cursor-grabbing",
            )}
          >
            <OrderCard
              text={items[item]}
              position={position}
              state={stateFor(item, position)}
              lifted={dragging === item}
              correctPosition={item}
              interactive={!locked}
              compact={compact}
            />
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {exercise.endLabel && <EndLabel icon={ArrowDown} text={exercise.endLabel} />}
      {!locked && (
        <p className="mt-1 flex flex-wrap items-center justify-center gap-1.5 text-sm font-semibold text-muted">
          Drag the cards, or press <Kbd>1</Kbd>–<Kbd>{order.length}</Kbd> to pick one and <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move it
        </p>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
