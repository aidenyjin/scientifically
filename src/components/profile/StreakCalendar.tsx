import { cn } from "@/lib/cn";
import type { ProfileView } from "@/server/services/profile";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Month grid: flame-orange active days, icy frozen days, ring on today. */
export function StreakCalendar({ days, monthLabel }: { days: ProfileView["calendar"]; monthLabel: string }) {
  const lead = days[0]?.weekday ?? 0;
  return (
    <div>
      <p className="font-display text-lg font-semibold">{monthLabel}</p>
      <div className="mt-3 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="text-xs font-bold text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((d) => (
          <span
            key={d.date}
            title={d.active ? "Practised" : d.frozen ? "Streak freeze" : undefined}
            className={cn(
              "grid aspect-square place-items-center rounded-full text-sm font-bold",
              d.active && "bg-streak text-white",
              d.frozen && "bg-freeze/25 text-[#1590cc]",
              !d.active && !d.frozen && (d.isFuture ? "text-line-strong" : "text-ink-soft"),
              d.isToday && "ring-2 ring-streak ring-offset-2 ring-offset-surface",
            )}
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
