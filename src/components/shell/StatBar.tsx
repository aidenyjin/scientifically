import { FlameIcon, GemIcon, HeartIcon } from "@/components/icons";
import type { ShellData } from "@/server/services/shell";

function Stat({ icon, value, color, label }: { icon: React.ReactNode; value: React.ReactNode; color: string; label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 font-display text-[17px] font-bold tabular-nums transition-colors duration-150 hover:bg-surface-2"
      style={{ color }}
    >
      {icon}
      {value}
    </span>
  );
}

export function StatBar({ data }: { data: ShellData }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex h-10 max-w-[150px] items-center truncate rounded-xl border-2 border-line px-3 text-sm font-bold whitespace-nowrap text-ink-soft" title="Current course">
        {data.pack?.subject ?? "No course"}
      </span>
      <div className="flex items-center">
        <Stat
          label={`${data.streak} day streak`}
          color={data.streakActiveToday ? "var(--streak)" : "var(--muted)"}
          icon={<FlameIcon size={26} muted={!data.streakActiveToday} />}
          value={data.streak}
        />
        <Stat label={`${data.gems} gems`} color="var(--gem)" icon={<GemIcon size={26} />} value={data.gems} />
        <Stat label={`${data.hearts} hearts`} color="var(--heart)" icon={<HeartIcon size={26} />} value={data.hearts} />
      </div>
    </div>
  );
}
