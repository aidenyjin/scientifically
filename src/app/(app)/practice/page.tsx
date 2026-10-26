import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { Character } from "@/characters/Character";
import { HeartIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GAME } from "@/game";
import { now } from "@/lib/clock";
import { requireUser } from "@/server/repo/users";
import { getPracticeOverview } from "@/server/services/practice";

/** "motion.units" → "Motion: units"; "cells.organelles" → "Cells: organelles". */
function prettyTag(tag: string): string {
  const parts = tag.split(".").map((p) => p.replace(/-/g, " "));
  const text = parts.length > 1 ? `${parts[0]}: ${parts.slice(1).join(" ")}` : parts[0];
  return text.replace(/^\w/, (c) => c.toUpperCase());
}

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ hearts?: string }> }) {
  const user = await requireUser();
  const { hearts } = await searchParams;
  const overview = await getPracticeOverview(user, now());
  const outOfHearts = hearts === "0";

  return (
    <div className="grid gap-6">
      {outOfHearts && (
        <div className="flex animate-rise-in items-center gap-4 rounded-2xl border-2 border-heart/40 bg-wrong-soft p-4">
          <HeartIcon size={36} muted />
          <p className="flex-1 font-bold text-wrong-ink">
            You&apos;re out of hearts. Practise to earn one back, or refill them in the shop.
          </p>
          <Link href="/shop" className={buttonClassName({ variant: "danger", size: "sm" })}>
            Refill
          </Link>
        </div>
      )}
      <header className="flex items-center gap-6">
        <Character id="pip" expression="thinking" size={120} animate />
        <div>
          <h1 className="font-display text-3xl font-semibold">Practice hub</h1>
          <p className="mt-1 text-ink-soft">
            Strengthen what you&apos;ve learned. Practice has unlimited hearts and earns {GAME.hearts.practiceRestore} back.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <PracticeCard
          title="Smart practice"
          body="Picks your weakest and most overdue skills."
          href="/lesson/practice"
          ready={overview?.canPractice ?? false}
          emptyText="Finish a lesson to unlock practice."
          variant="primary"
        />
        <PracticeCard
          title="Mistakes review"
          body={overview?.mistakes ? `${overview.mistakes} question${overview.mistakes === 1 ? "" : "s"} to fix` : "Retry questions you got wrong."}
          href="/lesson/mistakes"
          ready={overview?.canReviewMistakes ?? false}
          emptyText={overview?.canPractice ? "No mistakes to review — nice!" : "Questions you get wrong will show up here."}
          variant="danger"
          idle={overview?.canPractice ? "clear" : "locked"}
        />
      </div>

      {overview && overview.skills.length > 0 ? (
        <Card>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">Skill strength</h2>
            <p className="text-sm font-bold text-muted">Weakest first</p>
          </div>
          <ul className="mt-4 grid gap-3">
            {overview.skills.slice(0, 12).map((s) => (
              <li key={s.tag} className="flex items-center gap-4">
                <span className="w-36 shrink-0 truncate font-bold text-ink" title={s.tag}>
                  {prettyTag(s.tag)}
                </span>
                <ProgressBar
                  value={s.strength}
                  height={12}
                  color={s.strength < 0.4 ? "var(--wrong)" : s.strength < 0.7 ? "var(--xp)" : "var(--correct)"}
                  label={`${s.tag} strength`}
                />
                <span className={`w-12 shrink-0 text-right text-sm font-bold tabular-nums ${s.due ? "text-streak" : "text-muted"}`}>
                  {s.due ? "Due" : `${Math.round(s.strength * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="flex items-center gap-4 border-dashed">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2">
            <Lock className="size-6 text-muted" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Skill strength</h2>
            <p className="text-[15px] text-ink-soft">Your skills appear here as you finish lessons.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function PracticeCard({
  title,
  body,
  href,
  ready,
  emptyText,
  variant,
  idle = "locked",
}: {
  title: string;
  body: string;
  href: string;
  ready: boolean;
  emptyText: string;
  variant: "primary" | "danger";
  /** What the disabled button says: still locked, or nothing left to do. */
  idle?: "locked" | "clear";
}) {
  return (
    <Card className="flex flex-col">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 flex-1 text-[15px] text-ink-soft">{ready ? body : emptyText}</p>
      {ready ? (
        <Link href={href} className={buttonClassName({ variant, block: true, className: "mt-4" })}>
          Start
        </Link>
      ) : (
        <span className={buttonClassName({ block: true, disabled: true, className: "mt-4" })} aria-disabled="true">
          {idle === "locked" ? <Lock className="size-4" strokeWidth={3} /> : <Check className="size-4" strokeWidth={3} />}
          {idle === "locked" ? "Locked" : "All clear"}
        </span>
      )}
    </Card>
  );
}
