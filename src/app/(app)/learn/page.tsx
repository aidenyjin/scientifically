import Link from "next/link";
import { getActivePack } from "@/server/repo/packs";
import { getCompletedLessonIds } from "@/server/repo/progress";
import { getCurrentUser } from "@/server/repo/users";

// TEMPORARY list view — replaced by the winding course path (M6).
export default async function LearnPage() {
  const user = await getCurrentUser();
  const pack = await getActivePack(user.activePackId);
  if (!pack) return <p className="text-ink-soft">No published course yet. Generate one in /admin.</p>;
  const done = await getCompletedLessonIds(user.id, pack.id);
  return (
    <div className="grid gap-8">
      {pack.units.map((unit) => (
        <section key={unit.id}>
          <h2 className="font-display text-2xl font-semibold">{unit.title}</h2>
          <ul className="mt-3 grid gap-2">
            {unit.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link className="font-bold text-brand hover:underline" href={`/lesson/${lesson.id}`}>
                  {lesson.title} {done.has(lesson.id) ? "✓" : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
