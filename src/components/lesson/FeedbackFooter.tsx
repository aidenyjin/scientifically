"use client";

import { Check, X } from "lucide-react";
import { Character } from "@/characters/Character";
import type { CharacterId, Expression } from "@/characters/types";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import type { GradeResult } from "@/content/types";
import { cn } from "@/lib/cn";

const PRAISE = ["Nicely done", "Correct", "Spot on", "That's it", "Exactly right", "Well reasoned"];

/**
 * The bottom bar, and the guide's home during a lesson. While answering:
 * the guide waits beside Skip + Check. After checking the bar tints green
 * or red, the guide reacts, the explanation rises in, and the button
 * becomes Continue.
 */
export function FeedbackFooter({
  status,
  grade,
  explanation,
  canCheck,
  graded,
  praiseSeed,
  onCheck,
  onSkip,
  onContinue,
  raised = false,
  character,
}: {
  status: "answering" | "correct" | "incorrect";
  grade: GradeResult | null;
  explanation: string;
  canCheck: boolean;
  graded: boolean;
  praiseSeed: number;
  onCheck: () => void;
  onSkip: () => void;
  onContinue: () => void;
  /** Exercise content continues underneath: lift the bar with a soft shadow. */
  raised?: boolean;
  /** The guide shown at the left of the bar. */
  character?: { id: CharacterId; expression: Expression };
}) {
  const answered = status !== "answering";
  const correct = status === "correct";

  const guide = character && (
    <div className="relative -my-3 hidden size-[84px] shrink-0 sm:block">
      <Character
        id={character.id}
        expression={character.expression}
        size={96}
        animate
        className="absolute -top-5 -left-1.5 [@media(max-height:840px)]:-top-3 [@media(max-height:840px)]:size-[84px]"
      />
    </div>
  );

  return (
    <footer
      className={cn(
        "relative z-10 shrink-0 border-t transition-[background-color,border-color,box-shadow] duration-200",
        raised && "shadow-[0_-10px_24px_-14px_rgb(40_30_20/0.22)] dark:shadow-[0_-10px_24px_-14px_rgb(0_0_0/0.7)]",
        !answered && "border-line bg-panel",
        answered && graded && correct && "border-correct/20 bg-correct-soft",
        answered && graded && !correct && "border-wrong/20 bg-wrong-soft",
        answered && !graded && "border-line bg-panel",
      )}
    >
      <div className="mx-auto flex min-h-[120px] w-full max-w-[960px] items-center justify-between gap-6 px-8 py-5 [@media(max-height:840px)]:min-h-[100px] [@media(max-height:840px)]:py-4">
        {!answered && (
          <>
            <div className="flex items-center gap-5">
              {guide}
              {graded ? (
                <Button variant="secondary" size="lg" onClick={onSkip} className="w-32">
                  Skip
                </Button>
              ) : (
                <span />
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted hidden items-center gap-1.5 text-xs lg:flex">
                <Kbd>Enter</Kbd>
              </span>
              <Button size="lg" onClick={onCheck} disabled={!canCheck} className="w-40">
                {graded ? "Check" : "Continue"}
              </Button>
            </div>
          </>
        )}

        {answered && graded && (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-5">
              {guide}
              <div
                key={status}
                className={cn(
                  // A very long answer/explanation scrolls inside the bar instead of pushing the exercise away.
                  "animate-rise-in max-h-[min(40dvh,280px)] min-w-0 overflow-y-auto overscroll-contain",
                  correct ? "text-correct-ink" : "text-wrong-ink",
                )}
              >
                <p className="font-heading flex items-center gap-2 text-[26px] leading-tight">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-white",
                      correct ? "bg-correct" : "bg-wrong",
                    )}
                  >
                    {correct ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                  </span>
                  {correct ? PRAISE[praiseSeed % PRAISE.length] : "Not quite"}
                </p>
                {!correct && grade && (
                  <p className="mt-1.5 text-[15px] font-medium">
                    Correct answer: <RichText text={grade.correctAnswerText} />
                  </p>
                )}
                {grade?.feedback && (
                  <p className="mt-1 text-[15px]">
                    <RichText text={grade.feedback} />
                  </p>
                )}
                <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed opacity-90">
                  <RichText text={explanation} />
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Button
                variant={correct ? "success" : "danger"}
                size="lg"
                onClick={onContinue}
                className={cn("w-40", correct ? "focus-visible:outline-correct/50" : "focus-visible:outline-wrong/50")}
                autoFocus
              >
                Continue
              </Button>
              <span
                className={cn(
                  "hidden items-center gap-1.5 text-xs opacity-70 lg:flex",
                  correct ? "text-correct-ink" : "text-wrong-ink",
                )}
              >
                <Kbd className="h-5 border-current/30 text-current">Enter</Kbd>
              </span>
            </div>
          </>
        )}

        {answered && !graded && (
          <>
            <div className="flex items-center gap-5">{guide}</div>
            <Button size="lg" onClick={onContinue} className="w-40" autoFocus>
              Continue
            </Button>
          </>
        )}
      </div>
    </footer>
  );
}
