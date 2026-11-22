import { ArrowRight, HeartCrack } from "lucide-react";
import Link from "next/link";
import { Character } from "@/characters/Character";
import { CAST } from "@/characters/cast";
import { Greeting } from "@/components/home/Greeting";
import { StartShortcut } from "@/components/home/StartShortcut";
import { UpNextScene } from "@/components/path/UpNextScene";
import { buttonClassName } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { getActivePack } from "@/server/repo/packs";
import { requireUser } from "@/server/repo/users";
import { getCoursePath } from "@/server/services/course";

/** Home: a greeting and the one next thing to do. The full path lives on the course page. */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ hearts?: string }> }) {
  const user = await requireUser();
  const { hearts } = await searchParams;
  const pack = await getActivePack(user.activePackId);

  if (!pack) {
    return (
      <div className="mt-16 flex flex-col items-center text-center">
        <Character id="lumi" expression="thinking" size={150} animate />
        <h1 className="font-heading mt-4 text-4xl">No course yet</h1>
        <p className="text-ink-soft mt-2 max-w-sm">
          Generate a course with AI in the{" "}
          <Link href="/admin" className="text-ink font-medium underline underline-offset-4">
            admin area
          </Link>
          , then publish it to start learning.
        </p>
      </div>
    );
  }

  const { focus, next, total, finished } = await getCoursePath(user.id, pack);
  const guideId = CHARACTER_IDS[(focus?.index ?? 0) % CHARACTER_IDS.length];
  const guide = CAST[guideId];

  return (
    <div className="grid gap-10">
      <header className="grid gap-2 pt-2">
        <h1 className="font-heading text-[44px] leading-[1.05] font-light tracking-[-0.02em]">
          <Greeting name={user.name} />
        </h1>
        <p className="text-ink-soft">
          {next ? "One lesson today keeps your streak going." : "You've finished every lesson in this course."}
        </p>
      </header>

      {hearts === "0" && (
        <p
          role="status"
          className="border-wrong/20 bg-wrong-soft text-wrong-ink flex items-center gap-3 rounded-2xl border px-5 py-4 text-[15px]"
        >
          <HeartCrack className="size-5 shrink-0" strokeWidth={1.7} aria-hidden />
          <span>
            You&apos;re out of hearts. They come back over time, or you can refill them in the{" "}
            <Link href="/shop" className="font-medium underline underline-offset-4">
              Shop
            </Link>
            .
          </span>
        </p>
      )}

      {focus && (
        <section
          aria-labelledby="up-next"
          className="border-line bg-surface shadow-card grid gap-5 rounded-3xl border p-6"
        >
          <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">
            {next ? "Up next" : "Course complete"}
          </p>
          <UpNextScene
            lessons={focus.lessons}
            characterId={guideId}
            caption={
              next
                ? next.kind === "checkpoint"
                  ? `Unit ${focus.index + 1} · Review`
                  : `Unit ${focus.index + 1} · Lesson ${next.number} of ${next.of}`
                : `Unit ${focus.index + 1} · Complete`
            }
            label={`${guide.name}, your guide for ${focus.title}, beside lesson ${next?.number ?? focus.lessons.length} of ${focus.lessons.length}.`}
          />
          <div className="grid gap-2 px-1">
            <p className="text-ink-soft text-sm">
              <Link href={`/courses/${pack.id}`} className="hover:text-ink underline-offset-4 hover:underline">
                {pack.title}
              </Link>{" "}
              · Unit {focus.index + 1}: {focus.title} · with {guide.name}
            </p>
            <h2 id="up-next" className="font-heading text-[38px] leading-[1.08] font-light tracking-[-0.015em]">
              {next ? next.title : focus.title}
            </h2>
            {next && next.objectives.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2">
                {next.objectives.slice(0, 3).map((o) => (
                  <li key={o} className="bg-surface-2 text-ink-soft rounded-full px-3 py-1 text-[13px]">
                    {o}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-line flex flex-wrap items-center gap-4 border-t px-1 pt-5">
            <div className="flex min-w-[200px] flex-1 items-center gap-3">
              <ProgressBar value={total ? finished / total : 0} className="max-w-[140px]" label="Course progress" />
              <span className="text-ink-soft font-mono text-xs tabular-nums">
                {finished} of {total} lessons
              </span>
            </div>
            {next ? (
              <div className="flex items-center gap-3">
                <span className="text-muted hidden items-center gap-1.5 text-xs lg:flex">
                  <Kbd>Enter</Kbd>
                </span>
                <Link href={`/lesson/${next.id}`} data-current className={buttonClassName({ size: "lg" })}>
                  {next.kind === "checkpoint" ? "Start review" : "Start lesson"}
                  <ArrowRight className="size-4" strokeWidth={1.8} />
                </Link>
                <StartShortcut href={`/lesson/${next.id}`} />
              </div>
            ) : (
              <Link href="/courses" className={buttonClassName({ size: "lg", variant: "secondary" })}>
                Choose another course
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
