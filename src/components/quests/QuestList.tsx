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
          className={cn("flex items-center gap-4", !compact && "border-b-2 border-line py-5 last:border-b-0")}
        >
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-2xl",
              compact ? "size-11" : "size-16",
              q.completed ? "bg-correct-soft" : "bg-surface-2",
            )}
          >
            {q.completed ? (
              <Check className={cn("text-correct", compact ? "size-6" : "size-8")} strokeWidth={4} />
            ) : (
              <ChestIcon size={compact ? 28 : 40} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className={cn("font-bold text-ink", compact ? "text-[15px]" : "font-display text-lg font-semibold")}>
                {q.title}
              </p>
              {!compact && (
                <span className="flex items-center gap-1 text-sm font-bold text-gem">
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
              <span className="w-12 shrink-0 text-right text-sm font-bold text-muted tabular-nums">
                {q.progress}/{q.target}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
