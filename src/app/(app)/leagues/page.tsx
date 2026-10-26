import { Card } from "@/components/ui/Card";
import { LeagueBadge } from "@/components/leagues/LeagueBadge";
import { LeagueTable } from "@/components/leagues/LeagueTable";
import { TIERS } from "@/game";
import { now } from "@/lib/clock";
import { requireUser } from "@/server/repo/users";
import { getLeagueView } from "@/server/services/leagues";
import { ScrollToMe } from "@/components/leagues/ScrollToMe";

function formatLeft(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  return d >= 1 ? `${d} day${d === 1 ? "" : "s"}` : `${h} hour${h === 1 ? "" : "s"}`;
}

export default async function LeaguesPage() {
  const user = await requireUser();
  const view = await getLeagueView(user.id, now());
  return (
    <div className="grid gap-6">
      <header className="flex flex-col items-center text-center">
        {/* Five slots centred on the current tier; empty slots keep it in the middle. */}
        <div className="flex items-end gap-3 pt-1" aria-hidden>
          {[-2, -1, 0, 1, 2].map((offset) => {
            const i = view.tier + offset;
            if (i < 0 || i >= TIERS.length) return <span key={offset} className="w-12 shrink-0" />;
            return <LeagueBadge key={offset} tier={i} size={offset === 0 ? 76 : 48} muted={i > view.tier} />;
          })}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">{view.tierName} League</h1>
        <p className="mt-1 font-semibold text-ink-soft">
          Top {view.zones.promote} advance to the next league · <span className="text-streak">{formatLeft(view.timeLeftMs)} left</span>
        </p>
      </header>
      {view.myXp === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-line px-4 py-3 text-center text-[15px] font-semibold text-ink-soft">
          Finish a lesson to earn XP and start climbing the table.
        </p>
      )}
      <Card className="p-3">
        <LeagueTable view={view} />
      </Card>
      {view.myXp > 0 && <ScrollToMe />}
    </div>
  );
}
