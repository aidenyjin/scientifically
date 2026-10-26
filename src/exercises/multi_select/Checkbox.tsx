import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** How one option looks: answering states plus the post-check "missed" state. */
export type MultiOptionState = "idle" | "selected" | "correct" | "wrong" | "missed" | "dimmed";

const boxClasses: Record<MultiOptionState, string> = {
  idle: "border-line-strong bg-surface",
  selected: "border-brand bg-brand text-white",
  correct: "border-correct bg-correct text-white",
  wrong: "border-wrong bg-wrong text-white",
  missed: "border-dashed border-correct bg-surface text-correct",
  dimmed: "border-line bg-transparent",
};

/** The square tick box on the right of a multi-select option. Purely visual. */
export function Checkbox({ state }: { state: MultiOptionState }) {
  const icon =
    state === "wrong" ? (
      <X className="size-4" strokeWidth={3.5} />
    ) : state === "selected" || state === "correct" || state === "missed" ? (
      <Check className={cn("size-4", state === "missed" && "opacity-60")} strokeWidth={3.5} />
    ) : null;

  return (
    <span className="flex shrink-0 items-center gap-2" aria-hidden>
      {state === "missed" && (
        <span className="font-display text-xs font-semibold tracking-wide text-correct-ink uppercase">Missed</span>
      )}
      <span
        className={cn(
          "grid size-6 place-items-center rounded-lg border-2 transition-colors duration-150",
          boxClasses[state],
        )}
      >
        {icon}
      </span>
    </span>
  );
}
