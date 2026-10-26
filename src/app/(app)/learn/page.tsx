import Link from "next/link";
import { Character } from "@/characters/Character";
import { CoursePath } from "@/components/path/CoursePath";
import type { PathUnit } from "@/components/path/types";
import { flatLessons, getActivePack } from "@/server/repo/packs";
import { getCompletedLessonIds } from "@/server/repo/progress";
import { requireUser } from "@/server/repo/users";

const UNIT_COLORS = ["#6c5ce7", "#1cb0f6", "#2bc46b", "#ff9600", "#ff4b6e", "#a560e8", "#14b8a6", "#e3a008"];

export default async function LearnPage() {
  const user = await requireUser();
  const pack = await getActivePack(user.activePackId);

  if (!pack) {
    return (
      <div className="mt-16 flex flex-col items-center text-center">
        <Character id="lumi" expression="thinking" size={150} animate />
        <h1 className="mt-4 font-display text-3xl font-semibold">No course yet</h1>
        <p className="mt-2 max-w-sm text-ink-soft">
          Generate a course with AI in the{" "}
          <Link href="/admin" className="font-bold text-brand hover:underline">
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
      color: unit.color ?? UNIT_COLORS[index % UNIT_COLORS.length],
      completed: unit.lessons.filter((l) => done.has(l.id)).length,
      lessons: unit.lessons.map((lesson) => {
        const state = done.has(lesson.id) ? "completed" : lesson.id === currentLessonId ? "current" : "locked";
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

  return (
    <>
      <h1 className="sr-only">{pack.title}</h1>
      <CoursePath units={units} currentLessonId={currentLessonId} />
    </>
  );
}
