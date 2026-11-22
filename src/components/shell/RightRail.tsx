import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BoltIcon } from "@/components/icons";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ShellData } from "@/server/services/shell";
import { StatBar } from "./StatBar";

/**
 * Right column on wide screens. Cards here are summaries; each links to its
 * full page.
 */
export function RightRail({ data, children }: { data: ShellData; children?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-[calc(100dvh-16px)] w-[340px] shrink-0 flex-col gap-4 overflow-y-auto py-8 pl-2 min-[1200px]:flex">
      <StatBar data={data} />
      {children}
      <DailyGoalCard xp={data.xpToday} goal={data.dailyGoal} />
      {data.pack && (
        <Link
          href={`/courses/${data.pack.id}`}
          className="group border-line bg-surface shadow-card hover:border-line-strong block rounded-3xl border p-5 transition-[border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
        >
          <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">Current course</p>
          <p className="font-heading mt-1.5 text-xl leading-tight">{data.pack.title}</p>
          <p className="text-ink-soft mt-3 flex items-center gap-1.5 text-sm">
            See the full path
            <ArrowRight
              className="size-3.5 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
              strokeWidth={1.8}
            />
          </p>
        </Link>
      )}
    </aside>
  );
}

export function DailyGoalCard({ xp, goal }: { xp: number; goal: number }) {
  const done = xp >= goal;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Daily goal</CardTitle>
        <Link href="/profile#settings" className="text-ink-soft hover:text-ink text-sm font-medium underline-offset-4 hover:underline">
          Edit
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="shrink-0">
          <BoltIcon size={36} />
        </span>
        <div className="flex-1">
          <p className="text-ink-soft mb-2 text-sm">
            {done ? "Goal reached — nice!" : `Earn ${goal} XP today`}
          </p>
          <ProgressBar
            value={xp / goal}
            color="var(--xp)"
            height={12}
            label="Daily goal progress"
          />
        </div>
        <span className="text-muted w-14 text-right font-mono text-xs tabular-nums">
          {Math.min(xp, goal)}/{goal}
        </span>
      </div>
    </Card>
  );
}
