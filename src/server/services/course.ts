import "server-only";
import type { PathUnit } from "@/components/path/types";
import type { ContentPack } from "@/content/schema/course";
import { flatLessons } from "@/server/repo/packs";
import { getCompletedLessonIds } from "@/server/repo/progress";

/** One course's path for a learner: units with lesson states, the next lesson and totals. */
export async function getCoursePath(userId: string, pack: ContentPack) {
  const done = await getCompletedLessonIds(userId, pack.id);
  // Lessons unlock strictly in order; the first incomplete one is current.
  const currentLessonId = flatLessons(pack).find((l) => !done.has(l.lesson.id))?.lesson.id ?? null;
  const units: PathUnit[] = pack.units.map((unit, index) => {
    const standard = unit.lessons.filter((l) => l.kind === "standard");
    const numbers = new Map(standard.map((l, i) => [l.id, i + 1]));
    return {
      id: unit.id,
      index,
      title: unit.title,
      description: unit.description,
      color: unit.color ?? "var(--brand)",
      completed: unit.lessons.filter((l) => done.has(l.id)).length,
      lessons: unit.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.kind,
        objectives: lesson.objectives,
        state: done.has(lesson.id) ? "completed" : lesson.id === currentLessonId ? "current" : "locked",
        number: numbers.get(lesson.id) ?? standard.length,
        of: standard.length,
      })),
    };
  });
  const total = units.reduce((n, u) => n + u.lessons.length, 0);
  const finished = units.reduce((n, u) => n + u.completed, 0);
  // The unit in focus: the one holding the next lesson, else the last one.
  const focus = units.find((u) => u.lessons.some((l) => l.state === "current")) ?? units[units.length - 1] ?? null;
  const next = focus?.lessons.find((l) => l.state === "current") ?? null;
  return { units, currentLessonId, total, finished, focus, next };
}
