import { ArrowRight, Check } from "lucide-react";
import { RichText } from "@/components/ui/RichText";
import { cn } from "@/lib/cn";

/**
 * Small inline "→ right answer" pill shown next to a wrong blank/tile/segment
 * after checking. `subtle` drops the background (e.g. a forgiven misspelling).
 */
export function AnswerReveal({
  text,
  label = "Correct answer:",
  subtle,
  className,
}: {
  text: string;
  label?: string;
  subtle?: boolean;
  className?: string;
}) {
  const Icon = subtle ? Check : ArrowRight;
  return (
    <span
      className={cn(
        // Inline (not flex) so a long correction wraps with the surrounding prose.
        "inline animate-pop-in rounded-xl py-1 box-decoration-clone font-display text-[18px] leading-tight font-semibold text-correct-ink",
        subtle ? "px-1" : "bg-correct-soft px-2.5",
        className,
      )}
    >
      <Icon className="mr-1 inline size-4 align-[-2px]" strokeWidth={3} aria-hidden />
      <span className="sr-only">{label}</span>
      <RichText text={text} />
    </span>
  );
}
