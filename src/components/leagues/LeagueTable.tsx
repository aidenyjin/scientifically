import { ChevronsDown, ChevronsUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LeagueView } from "@/server/services/leagues";

const MEDALS = ["#ffc800", "#c0c7d6", "#e0955a"];

export function LeagueTable({ view }: { view: LeagueView }) {
  const { promote, demote } = view.zones;
  const size = view.rows.length;
  return (
    <ol className="grid">
      {view.rows.map((row, i) => {
        const showPromoteLine = promote > 0 && i === promote && view.tier < 9;
        const showDemoteLine = demote > 0 && i === size - demote && view.tier > 0;
        return (
          <li key={row.id}>
            {showPromoteLine && <ZoneDivider kind="promote" />}
            {showDemoteLine && <ZoneDivider kind="demote" />}
            <div
              data-me={row.isMe || undefined}
              className={cn(
                "flex items-center gap-4 rounded-2xl px-3 py-2.5",
                row.isMe && "bg-brand-soft ring-2 ring-brand/40",
              )}
            >
              <span
                className={cn(
                  "w-8 text-center font-display text-lg font-bold tabular-nums",
                  row.zone === "promote" ? "text-correct" : row.zone === "demote" ? "text-wrong" : "text-muted",
                )}
              >
                {row.rank <= 3 ? (
                  <span
                    className="inline-grid size-8 place-items-center rounded-full text-[15px] text-white"
                    style={{ background: MEDALS[row.rank - 1] }}
                  >
                    {row.rank}
                  </span>
                ) : (
                  row.rank
                )}
              </span>
              <span
                aria-hidden
                className="grid size-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-white"
                style={{ background: row.color }}
              >
                {row.name.slice(0, 1).toUpperCase()}
              </span>
              <span className={cn("min-w-0 flex-1 truncate font-bold", row.isMe ? "text-brand" : "text-ink")}>
                {row.isMe ? `${row.name} (you)` : row.name}
              </span>
              <span className="font-bold text-ink-soft tabular-nums">{row.xp} XP</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ZoneDivider({ kind }: { kind: "promote" | "demote" }) {
  const up = kind === "promote";
  return (
    <div className={cn("my-2 flex items-center gap-3 text-sm font-bold", up ? "text-correct" : "text-wrong")}>
      <span className="h-0.5 flex-1 rounded bg-current opacity-30" />
      {up ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
      {up ? "Promotion zone" : "Demotion zone"}
      <span className="h-0.5 flex-1 rounded bg-current opacity-30" />
    </div>
  );
}
