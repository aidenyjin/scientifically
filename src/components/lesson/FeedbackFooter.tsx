"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { RichText } from "@/components/ui/RichText";
import type { GradeResult } from "@/content/types";
import { cn } from "@/lib/cn";

const PRAISE = ["Nicely done!", "Great work!", "Correct!", "Excellent!", "You got it!", "Spot on!"];

/**
 * The bottom bar. While answering: Skip + Check. After checking it turns
 * green or red with the explanation, and the button becomes Continue.
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
}) {
  const answered = status !== "answering";
  const correct = status === "correct";

  return (
    <footer
      className={cn(
        "border-t-2 transition-colors duration-200",
        !answered && "border-line bg-bg",
        answered && graded && correct && "border-transparent bg-correct-soft",
        answered && graded && !correct && "border-transparent bg-wrong-soft",
        answered && !graded && "border-line bg-bg",
      )}
    >
      <div className="mx-auto flex min-h-[140px] w-full max-w-[1040px] items-center justify-between gap-8 px-8 py-6">
        {!answered && (
          <>
            {graded ? (
              <Button variant="secondary" size="lg" onClick={onSkip} className="w-40">
                Skip
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs font-semibold text-muted lg:flex">
                <Kbd>Enter</Kbd>
              </span>
              <Button
                variant="success"
                size="lg"
                onClick={onCheck}
                disabled={!canCheck}
                className="w-44"
              >
                {graded ? "Check" : "Continue"}
              </Button>
            </div>
          </>
        )}

        {answered && graded && (
          <>
            <div key={status} className="flex min-w-0 flex-1 animate-rise-in items-start gap-4">
              <div
                className={cn(
                  "grid size-16 shrink-0 place-items-center rounded-full bg-surface",
                  correct ? "text-correct" : "text-wrong",
                )}
              >
                {correct ? <Check className="size-9" strokeWidth={4} /> : <X className="size-9" strokeWidth={4} />}
              </div>
              <div className={cn("min-w-0", correct ? "text-correct-ink" : "text-wrong-ink")}>
                <p className="font-display text-2xl font-semibold">
                  {correct ? PRAISE[praiseSeed % PRAISE.length] : "Not quite"}
                </p>
                {!correct && grade && (
                  <p className="mt-1 text-[16px] font-bold">
                    Correct answer: <RichText text={grade.correctAnswerText} className="font-semibold" />
                  </p>
                )}
                {grade?.feedback && (
                  <p className="mt-1 text-[15px] font-semibold">
                    <RichText text={grade.feedback} />
                  </p>
                )}
                <p className="mt-1.5 max-w-[60ch] text-[15px] leading-snug font-medium opacity-90">
                  <RichText text={explanation} />
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Button variant={correct ? "success" : "danger"} size="lg" onClick={onContinue} className="w-44" autoFocus>
                Continue
              </Button>
              <span className={cn("hidden items-center gap-1.5 text-xs font-semibold opacity-70 lg:flex", correct ? "text-correct-ink" : "text-wrong-ink")}>
                <Kbd className="h-5 border-current/30 text-current">Enter</Kbd>
              </span>
            </div>
          </>
        )}

        {answered && !graded && (
          <>
            <span />
            <Button variant="success" size="lg" onClick={onContinue} className="w-44" autoFocus>
              Continue
            </Button>
          </>
        )}
      </div>
    </footer>
  );
}
