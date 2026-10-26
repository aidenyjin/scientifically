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
        <div className="flex items-end gap-3" aria-hidden>
          {TIERS.map((_, i) =>
            Math.abs(i - view.tier) <= 2 ? (
              <LeagueBadge key={i} tier={i} size={i === view.tier ? 76 : 48} muted={i > view.tier} />
            ) : null,
          )}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">{view.tierName} League</h1>
        <p className="mt-1 font-semibold text-ink-soft">
          Top {view.zones.promote} advance to the next league · <span className="text-streak">{formatLeft(view.timeLeftMs)} left</span>
        </p>
      </header>
      <Card className="p-3">
        <LeagueTable view={view} />
      </Card>
      <ScrollToMe />
    </div>
  );
}
