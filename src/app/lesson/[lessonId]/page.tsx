import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { findLesson, getActivePack } from "@/server/repo/packs";
import { getCurrentUser } from "@/server/repo/users";
import { abandonLessonAction, completeLessonAction, refillHeartsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  const pack = await getActivePack(user.activePackId);
  if (!pack) notFound();
  const found = findLesson(pack, lessonId);
  if (!found) notFound();

  return (
    <LessonPlayer
      packId={pack.id}
      lessonId={found.lesson.id}
      title={found.lesson.title}
      mode={found.lesson.kind === "checkpoint" ? "checkpoint" : "standard"}
      exercises={found.lesson.exercises}
      hearts={user.wallet?.hearts ?? 5}
      gems={user.wallet?.gems ?? 0}
      exitHref="/learn"
      onComplete={completeLessonAction}
      onAbandon={abandonLessonAction}
      onRefillHearts={refillHeartsAction}
    />
  );
}
