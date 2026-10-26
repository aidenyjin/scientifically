"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ExerciseProps } from "@/content/types";
import { digitKeys, useHotkeys } from "@/lib/keyboard";
import { shuffledOrder } from "@/lib/rng";
import { ChoiceOption, type ChoiceState } from "../_shared/ChoiceOption";
import { Bubble } from "./Bubble";
import { expressionForLine, layoutLines } from "./layout";
import type { Dialogue, DialogueResponse } from "./schema";

/** Delay between chat lines appearing. */
const LINE_STAGGER_MS = 220;
const OPTION_STAGGER_MS = 50;

export function DialogueView({
  exercise,
  status,
  onChange,
  seed,
}: ExerciseProps<Dialogue, DialogueResponse>) {
  const { lines, question } = exercise;
  const order = useMemo(
    () => shuffledOrder(question.options.length, seed),
    [question.options.length, seed],
  );
  const layout = useMemo(() => layoutLines(lines), [lines]);
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);
  // Steps revealed: 1..lines.length are chat lines; lines.length + 1 shows the options.
  const [step, setStep] = useState(1);
  const locked = status !== "answering";
  const done = reduceMotion || locked || step > lines.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setStep((s) => s + 1), LINE_STAGGER_MS);
    return () => clearTimeout(timer);
  }, [done, step]);

  const revealAll = () => setStep(lines.length + 1);

  const pick = (originalIndex: number) => {
    if (locked) return;
    setSelected(originalIndex);
    onChange({ index: originalIndex });
  };

  // Keyboard users shouldn't wait: a digit during the reveal shows everything.
  useHotkeys(
    digitKeys(order.length, (i) => (done ? pick(order[i]) : revealAll())),
    { enabled: !locked },
  );

  const stateFor = (originalIndex: number): ChoiceState => {
    if (!locked) return selected === originalIndex ? "selected" : "idle";
    if (originalIndex === question.answerIndex) return "correct";
    if (originalIndex === selected) return "wrong";
    return "dimmed";
  };

  const visible = done ? lines.length : step;

  return (
    <div className="grid gap-5">
      <ol
        aria-label="Conversation"
        aria-live="polite"
        onClick={done ? undefined : revealAll}
        className="bg-surface-2/70 grid gap-3 rounded-3xl px-5 py-4"
      >
        {lines.slice(0, visible).map((line, i) => (
          <Bubble
            key={i}
            characterId={line.characterId}
            text={line.text}
            side={layout[i].side}
            startsRun={layout[i].startsRun}
            expression={expressionForLine(line.text, status)}
          />
        ))}
      </ol>

      {done && (
        <div role="radiogroup" aria-label="Answer options" className="grid gap-2.5">
          {order.map((originalIndex, position) => (
            <div
              key={originalIndex}
              className="animate-rise-in"
              style={{ animationDelay: `${position * OPTION_STAGGER_MS}ms` }}
            >
              <ChoiceOption
                text={question.options[originalIndex]}
                shortcut={position + 1}
                state={stateFor(originalIndex)}
                disabled={locked}
                onClick={() => pick(originalIndex)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
