import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";
import type { ProfileView } from "@/server/services/profile";

export function AchievementGrid({ items }: { items: ProfileView["achievements"] }) {
  return (
    <ul className="grid grid-cols-1 gap-0">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-4 border-b-2 border-line py-4 last:border-b-0">
          <div
            className={cn(
              "relative grid size-16 shrink-0 place-items-center rounded-2xl text-3xl",
              a.tier > 0 ? "bg-xp/20" : "bg-surface-2 grayscale",
            )}
          >
            <span aria-hidden>{a.icon}</span>
            {a.tier > 0 && (
              <span
                className="absolute -bottom-2 rounded-full bg-streak px-2 font-display text-xs leading-5 font-bold text-white ring-2 ring-surface"
                aria-label={`Tier ${a.tier}`}
              >
                {"I".repeat(Math.min(3, a.tier)) + (a.tier > 3 ? `+${a.tier - 3}` : "")}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-lg font-semibold">{a.title}</p>
              <span className="text-sm font-bold text-muted tabular-nums">
                {a.complete || a.nextThreshold === null ? "Complete" : `${Math.min(a.value, a.nextThreshold)}/${a.nextThreshold}`}
              </span>
            </div>
            <ProgressBar value={a.progress} color="var(--xp)" height={12} className="mt-1.5" label={`${a.title} progress`} />
            <p className="mt-1.5 text-sm text-ink-soft">{a.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
