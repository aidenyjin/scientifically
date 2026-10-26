import Link from "next/link";
import { notFound } from "next/navigation";
import { ExerciseReviewCard } from "@/components/admin/ExerciseReviewCard";
import { PackActions } from "@/components/admin/PackActions";
import { RegenerateLesson } from "@/components/admin/RegenerateLesson";
import { StatusPill } from "@/components/admin/StatusPill";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCore } from "@/content/registry";
import { contentPackSchema, formatIssues } from "@/content/schema/course";
import { requireAdmin } from "@/server/admin/auth";
import { checkPack, parseGeneratedBy } from "@/server/ai";
import { db } from "@/server/db";
import { cn } from "@/lib/cn";

export default async function PackReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { id } = await params;
  const { lesson: lessonParam } = await searchParams;
  await requireAdmin(`/admin/packs/${id}`);
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) notFound();

  const parsed = contentPackSchema.safeParse(JSON.parse(row.json));
  if (!parsed.success) {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold">{row.title}</h1>
        <p className="text-wrong-ink mt-2 font-bold">
          This pack&apos;s JSON doesn&apos;t match the schema:
        </p>
        <ul className="text-ink-soft mt-2 font-mono text-xs">
          {formatIssues(parsed.error).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Card>
    );
  }
  const pack = parsed.data;
  const info = parseGeneratedBy(row.generatedBy);
  const check = checkPack(pack);

  // Problems per exercise id (from autoCheck) and per lesson (from generation).
  const byExercise = new Map<string, string[]>();
  for (const e of check.errors) {
    const m = e.match(/\("([^"]+)", [a-z_]+\): (.*)$/);
    if (m) byExercise.set(m[1], [...(byExercise.get(m[1]) ?? []), m[2]]);
  }
  const lessonNotes = new Map<string, string[]>();
  for (const n of info?.needsReview ?? [])
    lessonNotes.set(n.lessonId, [
      ...(lessonNotes.get(n.lessonId) ?? []),
      ...n.errors.map((e) => (n.exerciseId ? `${n.exerciseId} (dropped): ${e}` : e)),
    ]);
  for (const f of info?.failedLessons ?? [])
    lessonNotes.set(f.lessonId, [
      ...(lessonNotes.get(f.lessonId) ?? []),
      `Lesson failed to generate: ${f.errors.join("; ")}`,
    ]);

  const all = pack.units.flatMap((u) => u.lessons.map((l) => ({ unit: u, lesson: l })));
  const selected = all.find((x) => x.lesson.id === lessonParam) ?? all[0];
  const issueCount = (lessonId: string) =>
    (lessonNotes.get(lessonId)?.length ?? 0) +
    (all
      .find((x) => x.lesson.id === lessonId)
      ?.lesson.exercises.reduce((n, e) => n + (byExercise.get(e.id)?.length ?? 0), 0) ?? 0);

  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <StatusPill status={row.status} />
            <code className="text-muted text-sm">{pack.id}</code>
            {info && (
              <span className="text-muted text-sm font-semibold">
                · {info.provider} / {info.model}
              </span>
            )}
          </div>
          <h1 className="font-display mt-2 text-3xl font-semibold">{pack.title}</h1>
          <p className="text-ink-soft mt-1 font-semibold">
            {pack.subject} · {pack.level} · {check.stats?.lessons} lessons ·{" "}
            {check.stats?.exercises} exercises
          </p>
          <p className="text-ink-soft mt-1 max-w-2xl text-sm">{pack.description}</p>
        </div>
        <PackActions packId={pack.id} status={row.status} />
      </header>

      {check.errors.length > 0 && (
        <p className="bg-wrong-soft text-wrong-ink rounded-2xl px-4 py-3 text-sm font-bold">
          {check.errors.length} problem{check.errors.length === 1 ? "" : "s"} found by automatic
          checks — fix or delete those exercises before publishing.
        </p>
      )}

      <div className="grid grid-cols-[280px_1fr] items-start gap-6">
        <nav
          aria-label="Lessons"
          className="sticky top-24 grid max-h-[calc(100dvh-8rem)] gap-4 overflow-y-auto"
        >
          {pack.units.map((unit, u) => (
            <div key={unit.id}>
              <p className="text-muted px-2 text-xs font-bold tracking-wider uppercase">
                Unit {u + 1} · {unit.title}
              </p>
              <ul className="mt-1 grid gap-0.5">
                {unit.lessons.map((l) => {
                  const issues = issueCount(l.id);
                  const active = l.id === selected?.lesson.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/admin/packs/${pack.id}?lesson=${l.id}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold transition-colors duration-150",
                          active ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-surface-2",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {l.kind === "checkpoint" ? "🏆 " : ""}
                          {l.title}
                        </span>
                        <span className="text-muted text-xs">{l.exercises.length}</span>
                        {issues > 0 && (
                          <span className="bg-wrong rounded-full px-1.5 text-xs text-white">
                            {issues}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {selected && (
          <section className="grid gap-5">
            <Card className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted text-xs font-bold tracking-wider uppercase">
                  {selected.unit.title}
                </p>
                <h2 className="font-display text-2xl font-semibold">{selected.lesson.title}</h2>
                <p className="text-ink-soft text-sm">{selected.lesson.objectives.join(" · ")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <RegenerateLesson
                  packId={pack.id}
                  lessonId={selected.lesson.id}
                  title={selected.lesson.title}
                />
                <Link
                  href={`/admin/packs/${pack.id}/play/${selected.lesson.id}`}
                  className={buttonClassName({})}
                >
                  Play lesson
                </Link>
              </div>
            </Card>
            {lessonNotes.get(selected.lesson.id) && (
              <ul className="border-wrong/40 bg-wrong-soft text-wrong-ink rounded-2xl border-2 px-5 py-3 text-sm font-bold">
                <li className="mb-1 text-xs tracking-wider uppercase">Flagged during generation</li>
                {lessonNotes.get(selected.lesson.id)!.map((n) => (
                  <li key={n}>⚠ {n}</li>
                ))}
              </ul>
            )}
            {selected.lesson.exercises.map((ex, i) => (
              <ExerciseReviewCard
                key={ex.id}
                packId={pack.id}
                exercise={ex}
                index={i}
                label={getCore(ex.type).label}
                problems={byExercise.get(ex.id) ?? []}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
