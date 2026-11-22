import { ArrowRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoursePath } from "@/components/path/CoursePath";
import { buttonClassName } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { db } from "@/server/db";
import { getPack } from "@/server/repo/packs";
import { requireUser } from "@/server/repo/users";
import { getCoursePath } from "@/server/services/course";

export default async function CoursePage({ params }: { params: Promise<{ packId: string }> }) {
  const { packId } = await params;
  const user = await requireUser();
  const row = await db.contentPack.findUnique({ where: { id: packId }, select: { status: true, level: true } });
  if (row?.status !== "published") notFound();
  const pack = await getPack(packId);
  if (!pack) notFound();
  const path = await getCoursePath(user.id, pack);

  return (
    <div className="grid gap-8">
      <Link
        href="/courses"
        className="text-ink-soft hover:text-ink -mb-4 flex w-fit items-center gap-1 text-sm transition-colors duration-150"
      >
        <ChevronLeft className="size-4" strokeWidth={1.8} /> Courses
      </Link>
      <header className="border-line bg-surface shadow-card flex flex-wrap items-end gap-6 rounded-3xl border p-7">
        <div className="min-w-[260px] flex-1">
          <p className="text-ink-soft text-[11px] font-medium tracking-[0.16em] uppercase">
            {pack.subject} · {row.level}
          </p>
          <h1 className="font-heading mt-1.5 text-[44px] leading-[1.05] font-light tracking-[-0.02em]">{pack.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <ProgressBar
              value={path.total ? path.finished / path.total : 0}
              className="max-w-[180px]"
              label="Course progress"
            />
            <span className="text-ink-soft font-mono text-xs tabular-nums">
              {path.finished} of {path.total} lessons
            </span>
          </div>
        </div>
        {path.next && (
          <Link href={`/lesson/${path.next.id}`} className={buttonClassName({ size: "lg" })}>
            {path.finished > 0 ? "Continue" : "Start course"}
            <ArrowRight className="size-4" strokeWidth={1.8} />
          </Link>
        )}
      </header>
      <CoursePath units={path.units} currentLessonId={path.currentLessonId} />
    </div>
  );
}
