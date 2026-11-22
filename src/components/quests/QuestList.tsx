import { Check } from "lucide-react";
import { ChestIcon, GemIcon } from "@/components/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { QuestView } from "@/server/services/quests";

/** Daily quests with progress bars. `compact` for the right rail. */
export function QuestList({ quests, compact = false }: { quests: QuestView[]; compact?: boolean }) {
  return (
    <ul className={cn("grid", compact ? "gap-4" : "gap-0")}>
      {quests.map((q) => (
        <li
          key={q.id}
          className={cn("flex items-center gap-4", !compact && "border-line border-b py-5 last:border-b-0")}
        >
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-2xl",
              compact ? "size-10" : "size-14",
              q.completed ? "bg-correct-soft" : "bg-surface-2",
            )}
          >
            {q.completed ? (
              <Check className={cn("text-correct", compact ? "size-5" : "size-6")} strokeWidth={2.4} />
            ) : (
              <ChestIcon size={compact ? 22 : 30} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn("text-ink", compact ? "text-[14px]" : "font-heading text-[22px] leading-tight")}>
                {q.title}
              </p>
              {!compact && (
                <span className="text-ink-soft flex items-center gap-1 font-mono text-xs">
                  <GemIcon size={16} /> {q.rewardGems}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <ProgressBar
                value={q.progress / q.target}
                color={q.completed ? "var(--correct)" : "var(--xp)"}
                height={compact ? 12 : 16}
                label={`${q.title} progress`}
              />
              <span className="text-muted w-12 shrink-0 text-right font-mono text-xs tabular-nums">
                {q.progress}/{q.target}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
