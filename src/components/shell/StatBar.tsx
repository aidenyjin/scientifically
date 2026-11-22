import { FlameIcon, GemIcon, HeartIcon } from "@/components/icons";
import type { ShellData } from "@/server/services/shell";
import { CourseSwitcher } from "./CourseSwitcher";

function Stat({
  icon,
  value,
  color,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  color: string;
  label: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className="hover:bg-surface-2 flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 font-mono text-[14px] font-medium tabular-nums transition-colors duration-150"
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
      <CourseSwitcher packs={data.packs} activeId={data.pack?.id ?? null} />
      <div className="flex items-center">
        <Stat
          label={`${data.streak} day streak`}
          color={data.streakActiveToday ? "var(--ink)" : "var(--muted)"}
          icon={<FlameIcon size={20} muted={!data.streakActiveToday} />}
          value={data.streak}
        />
        <Stat
          label={`${data.gems} gems`}
          color="var(--ink)"
          icon={<GemIcon size={20} />}
          value={data.gems}
        />
        <Stat
          label={`${data.hearts} hearts`}
          color="var(--ink)"
          icon={<HeartIcon size={20} />}
          value={data.hearts}
        />
      </div>
    </div>
  );
}
