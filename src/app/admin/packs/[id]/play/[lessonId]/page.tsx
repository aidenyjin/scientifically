import { notFound } from "next/navigation";
import { PreviewPlayer } from "@/components/lesson/PreviewPlayer";
import { requireAdmin } from "@/server/admin/auth";
import { findLesson, getPack } from "@/server/repo/packs";

/** Play any lesson in the real player without saving progress. */
export default async function AdminPlayPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  await requireAdmin(`/admin/packs/${id}/play/${lessonId}`);
  const pack = await getPack(id);
  const found = pack && findLesson(pack, lessonId);
  if (!found) notFound();
  return (
    <div className="fixed inset-0 z-50 bg-bg">
      <PreviewPlayer exercises={found.lesson.exercises} title={found.lesson.title} exitHref={`/admin/packs/${id}?lesson=${lessonId}`} />
    </div>
  );
}
