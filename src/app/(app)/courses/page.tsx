import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getActivePack, getPack, listPacks } from "@/server/repo/packs";
import { requireUser } from "@/server/repo/users";
import { getCoursePath } from "@/server/services/course";

export default async function CoursesPage() {
  const user = await requireUser();
  const [rows, active] = await Promise.all([listPacks("published"), getActivePack(user.activePackId)]);
  const courses = (
    await Promise.all(
      rows.map(async (row) => {
        const pack = await getPack(row.id);
        if (!pack) return null;
        const path = await getCoursePath(user.id, pack);
        return { row, pack, path };
      }),
    )
  ).filter((c) => c !== null);

  return (
    <div className="grid gap-8">
      <header className="grid gap-2 pt-2">
        <h1 className="font-heading text-[44px] leading-[1.05] font-light tracking-[-0.02em]">Courses</h1>
        <p className="text-ink-soft">Pick up where you left off, or start something new.</p>
      </header>

      {courses.length === 0 ? (
        <p className="border-line bg-surface text-ink-soft rounded-3xl border p-8 text-center">
          No courses are published yet.
        </p>
      ) : (
        <ul className="grid gap-4">
          {courses.map(({ row, pack, path }) => {
            const isActive = active?.id === pack.id;
            const started = path.finished > 0;
            return (
              <li key={pack.id}>
                <Link
                  href={`/courses/${pack.id}`}
                  className="group border-line bg-surface shadow-card hover:border-line-strong flex flex-wrap items-center gap-6 rounded-3xl border p-6 transition-[border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
                >
                  <div className="min-w-[240px] flex-1">
                    <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">
                      {row.subject} · {row.level}
                      {isActive && <span className="text-brand"> · Current course</span>}
                    </p>
                    <h2 className="font-heading mt-1.5 text-[30px] leading-tight tracking-[-0.01em]">{pack.title}</h2>
                    <p className="text-ink-soft mt-1 text-sm">
                      {pack.units.length} {pack.units.length === 1 ? "unit" : "units"} ·{" "}
                      {path.next ? `Next: ${path.next.title}` : "All lessons done"}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <ProgressBar
                        value={path.total ? path.finished / path.total : 0}
                        className="max-w-[180px]"
                        label={`${pack.title} progress`}
                      />
                      <span className="text-ink-soft font-mono text-xs tabular-nums">
                        {path.finished} of {path.total} lessons
                      </span>
                    </div>
                  </div>
                  <span className="text-ink flex items-center gap-2 text-[15px] font-medium">
                    {started ? "Continue" : "Open course"}
                    <ArrowRight
                      className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5"
                      strokeWidth={1.8}
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
