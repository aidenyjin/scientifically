import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Character } from "@/characters/Character";
import { CAST } from "@/characters/cast";
import { Greeting } from "@/components/home/Greeting";
import { CoursePath } from "@/components/path/CoursePath";
import type { PathUnit } from "@/components/path/types";
import { UpNextScene } from "@/components/path/UpNextScene";
import { buttonClassName } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { flatLessons, getActivePack } from "@/server/repo/packs";
import { getCompletedLessonIds } from "@/server/repo/progress";
import { requireUser } from "@/server/repo/users";

export default async function LearnPage() {
  const user = await requireUser();
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

  const done = await getCompletedLessonIds(user.id, pack.id);
  // Lessons unlock strictly in order; the first incomplete one is current.
  const currentLessonId = flatLessons(pack).find((l) => !done.has(l.lesson.id))?.lesson.id ?? null;
  const units: PathUnit[] = pack.units.map((unit, index) => {
    const standard = unit.lessons.filter((l) => l.kind === "standard").length;
    const numbers = new Map<string, number>();
    unit.lessons.filter((l) => l.kind === "standard").forEach((l, i) => numbers.set(l.id, i + 1));
    return {
      id: unit.id,
      index,
      title: unit.title,
      description: unit.description,
      color: unit.color ?? "var(--brand)",
      completed: unit.lessons.filter((l) => done.has(l.id)).length,
      lessons: unit.lessons.map((lesson) => {
        const state = done.has(lesson.id)
          ? "completed"
          : lesson.id === currentLessonId
            ? "current"
            : "locked";
        return {
          id: lesson.id,
          title: lesson.title,
          kind: lesson.kind,
          objectives: lesson.objectives,
          state,
          number: numbers.get(lesson.id) ?? standard,
          of: standard,
        };
      }),
    };
  });

  const total = units.reduce((n, u) => n + u.lessons.length, 0);
  const finished = units.reduce((n, u) => n + u.completed, 0);
  // The unit in focus: the one holding the next lesson, else the last one.
  const focus =
    units.find((u) => u.lessons.some((l) => l.state === "current")) ?? units[units.length - 1];
  const next = focus?.lessons.find((l) => l.state === "current") ?? null;
  const guideId = CHARACTER_IDS[(focus?.index ?? 0) % CHARACTER_IDS.length];
  const guide = CAST[guideId];

  return (
    <div className="grid gap-10">
      <header className="grid gap-2 pt-2">
        <h1 className="font-heading text-[44px] leading-[1.05] font-light tracking-[-0.02em]">
          <Greeting name={user.name} />
        </h1>
        <p className="text-ink-soft">
          {next
            ? "One lesson today keeps your streak going."
            : "You've finished every lesson in this course."}
        </p>
      </header>

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
              {pack.title} · Unit {focus.index + 1}: {focus.title} · with {guide.name}
            </p>
            <h2
              id="up-next"
              className="font-heading text-[38px] leading-[1.08] font-light tracking-[-0.015em]"
            >
              {next ? next.title : focus.title}
            </h2>
            {next && next.objectives.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2">
                {next.objectives.slice(0, 3).map((o) => (
                  <li
                    key={o}
                    className="bg-surface-2 text-ink-soft rounded-full px-3 py-1 text-[13px]"
                  >
                    {o}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-line flex flex-wrap items-center gap-4 border-t px-1 pt-5">
            <div className="flex min-w-[200px] flex-1 items-center gap-3">
              <ProgressBar
                value={total ? finished / total : 0}
                className="max-w-[140px]"
                label="Course progress"
              />
              <span className="text-ink-soft font-mono text-xs tabular-nums">
                {finished} of {total} lessons
              </span>
            </div>
            {next && (
              <Link href={`/lesson/${next.id}`} className={buttonClassName({ size: "lg" })}>
                {next.kind === "checkpoint" ? "Start review" : "Start lesson"}
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4">
        <h2 className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">
          {pack.title}
        </h2>
        <CoursePath units={units} currentLessonId={currentLessonId} />
      </div>
    </div>
  );
}
