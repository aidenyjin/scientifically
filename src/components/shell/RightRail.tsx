import Link from "next/link";
import { BoltIcon } from "@/components/icons";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ShellData } from "@/server/services/shell";
import { StatBar } from "./StatBar";

/**
 * Right column on wide screens. Cards here are summaries; each links to its
 * full page. Later milestones add the league and quests cards.
 */
export function RightRail({ data, children }: { data: ShellData; children?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[368px] shrink-0 flex-col gap-5 overflow-y-auto py-6 pr-8 pl-2 min-[1200px]:flex">
      <StatBar data={data} />
      {children}
      <DailyGoalCard xp={data.xpToday} goal={data.dailyGoal} />
    </aside>
  );
}

export function DailyGoalCard({ xp, goal }: { xp: number; goal: number }) {
  const done = xp >= goal;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Daily goal</CardTitle>
        <Link href="/profile#settings" className="text-sm font-bold text-brand hover:underline">
          Edit
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <BoltIcon size={36} />
        <div className="flex-1">
          <p className="mb-1.5 text-sm font-bold text-ink-soft">
            {done ? "Goal reached — nice!" : `Earn ${goal} XP today`}
          </p>
          <ProgressBar value={xp / goal} color="var(--xp)" height={14} label="Daily goal progress" />
        </div>
        <span className="w-14 text-right text-sm font-bold text-muted tabular-nums">
          {Math.min(xp, goal)}/{goal}
        </span>
      </div>
    </Card>
  );
}
