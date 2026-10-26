import Link from "next/link";
import { ImportPack } from "@/components/admin/ImportPack";
import { StatusPill } from "@/components/admin/StatusPill";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { contentPackSchema } from "@/content/schema/course";
import { requireAdmin } from "@/server/admin/auth";
import { parseGeneratedBy } from "@/server/ai";
import { db } from "@/server/db";

export default async function AdminPacksPage() {
  await requireAdmin("/admin");
  const rows = await db.contentPack.findMany({ orderBy: { updatedAt: "desc" } });
  const packs = rows.map((row) => {
    const parsed = contentPackSchema.safeParse(JSON.parse(row.json));
    const info = parseGeneratedBy(row.generatedBy);
    const exercises = parsed.success
      ? parsed.data.units.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.exercises.length, 0), 0)
      : 0;
    return {
      ...row,
      valid: parsed.success,
      units: parsed.success ? parsed.data.units.length : 0,
      exercises,
      review: (info?.needsReview.length ?? 0) + (info?.failedLessons.length ?? 0),
    };
  });

  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Course packs</h1>
          <p className="mt-1 text-ink-soft">Generate with AI, review, then publish for learners.</p>
        </div>
        <div className="flex items-center gap-3">
          <ImportPack />
          <Link href="/admin/generate" className={buttonClassName({})}>
            Generate a course
          </Link>
        </div>
      </header>

      {packs.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="font-display text-xl font-semibold">No packs yet</p>
          <p className="mt-1 text-ink-soft">Generate your first course with AI.</p>
          <Link href="/admin/generate" className={buttonClassName({ className: "mt-5" })}>
            Generate a course
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left">
            <thead className="border-b-2 border-line text-xs font-bold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-5 py-3">Pack</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Size</th>
                <th className="px-5 py-3">Review</th>
                <th className="px-5 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p.id} className="border-b-2 border-line transition-colors duration-150 last:border-b-0 hover:bg-surface-2">
                  <td className="px-5 py-4">
                    <Link href={`/admin/packs/${p.id}`} className="font-bold text-ink hover:text-brand">
                      {p.title}
                    </Link>
                    <p className="text-sm font-semibold text-muted">
                      {p.subject} · {p.level} · <code>{p.id}</code>
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-ink-soft">
                    {p.valid ? `${p.units} units · ${p.exercises} exercises` : <span className="text-wrong">Invalid JSON</span>}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold">
                    {p.review > 0 ? <span className="text-wrong">{p.review} to review</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-muted">{p.updatedAt.toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
