import Link from "next/link";
import { BoltIcon } from "@/components/icons";
import { LeagueBadge } from "@/components/leagues/LeagueBadge";
import { QuestList } from "@/components/quests/QuestList";
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
      <LeagueCard league={data.league} />
      <DailyGoalCard xp={data.xpToday} goal={data.dailyGoal} />
      <Card>
        <div className="flex items-center justify-between">
          <CardTitle>Daily quests</CardTitle>
          <Link href="/quests" className="text-brand text-sm font-bold hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4">
          <QuestList quests={data.quests} compact />
        </div>
      </Card>
    </aside>
  );
}

export function DailyGoalCard({ xp, goal }: { xp: number; goal: number }) {
  const done = xp >= goal;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>Daily goal</CardTitle>
        <Link href="/profile#settings" className="text-brand text-sm font-bold hover:underline">
          Edit
        </Link>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="shrink-0">
          <BoltIcon size={36} />
        </span>
        <div className="flex-1">
          <p className="text-ink-soft mb-1.5 text-sm font-bold">
            {done ? "Goal reached — nice!" : `Earn ${goal} XP today`}
          </p>
          <ProgressBar
            value={xp / goal}
            color="var(--xp)"
            height={14}
            label="Daily goal progress"
          />
        </div>
        <span className="text-muted w-14 text-right text-sm font-bold tabular-nums">
          {Math.min(xp, goal)}/{goal}
        </span>
      </div>
    </Card>
  );
}

function LeagueCard({ league }: { league: ShellData["league"] }) {
  const inZone = league.rank <= league.promote && league.xp > 0;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardTitle>{league.tierName} League</CardTitle>
        <Link href="/leagues" className="text-brand text-sm font-bold hover:underline">
          View league
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="shrink-0">
          <LeagueBadge tier={league.tier} size={46} />
        </span>
        <p className="text-ink-soft text-[15px] font-semibold">
          {league.xp === 0 ? (
            "Finish a lesson to start climbing this week's table."
          ) : (
            <>
              You&apos;re ranked <span className="text-ink font-bold">#{league.rank}</span> with{" "}
              <span className="text-ink font-bold">{league.xp} XP</span>
              {inZone ? " — in the promotion zone!" : "."}
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
