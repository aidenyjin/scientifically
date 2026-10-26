import Link from "next/link";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/server/admin/auth";
import { listJobs } from "@/server/ai";

export default async function JobsPage() {
  await requireAdmin("/admin/jobs");
  const jobs = await listJobs(50);
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-3xl font-semibold">Generation jobs</h1>
      {jobs.length === 0 ? (
        <Card className="py-12 text-center text-ink-soft">No jobs yet.</Card>
      ) : (
        <Card className="p-0">
          <ul>
            {jobs.map((j) => (
              <li key={j.id} className="border-b-2 border-line last:border-b-0">
                <Link href={`/admin/jobs/${j.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-2">
                  <StatusPill status={j.status} />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {j.params ? `${j.params.subject}: ${j.params.topic}` : j.id}
                  </span>
                  {j.progress && (
                    <span className="text-sm font-bold text-muted">
                      {j.progress.done}/{j.progress.total} lessons
                    </span>
                  )}
                  <span className="text-sm font-semibold text-muted">{j.createdAt.toLocaleString("en-GB")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
