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

function prettyTag(tag: string): string {
  const last = tag.split(".").pop() ?? tag;
  return last.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
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
          <p className="font-bold text-wrong-ink">
            You&apos;re out of hearts. Practise to earn one back, or refill in the{" "}
            <Link href="/shop" className="underline">
              shop
            </Link>
            .
          </p>
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
          emptyText="No mistakes to review — nice!"
          variant="danger"
        />
      </div>

      {overview && overview.skills.length > 0 && (
        <Card>
          <h2 className="font-display text-xl font-semibold">Skill strength</h2>
          <ul className="mt-4 grid gap-3">
            {overview.skills.slice(0, 12).map((s) => (
              <li key={s.tag} className="flex items-center gap-4">
                <span className="w-44 truncate font-bold text-ink" title={s.tag}>
                  {prettyTag(s.tag)}
                </span>
                <ProgressBar
                  value={s.strength}
                  height={12}
                  color={s.strength < 0.4 ? "var(--wrong)" : s.strength < 0.7 ? "var(--xp)" : "var(--correct)"}
                  label={`${s.tag} strength`}
                />
                <span className="w-16 text-right text-xs font-bold text-muted">{s.due ? "Due" : `${Math.round(s.strength * 100)}%`}</span>
              </li>
            ))}
          </ul>
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
}: {
  title: string;
  body: string;
  href: string;
  ready: boolean;
  emptyText: string;
  variant: "primary" | "danger";
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
          Start
        </span>
      )}
    </Card>
  );
}
