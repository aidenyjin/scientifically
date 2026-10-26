import { notFound, redirect } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { ClientSettings } from "@/components/shell/ClientSettings";
import type { Exercise } from "@/content/registry";
import type { LessonMode } from "@/engine/lesson";
import { now } from "@/lib/clock";
import { findLesson, getActivePack } from "@/server/repo/packs";
import { parseSettings, requireUser } from "@/server/repo/users";
import { PRACTICE_LESSON_IDS } from "@/server/services/lesson-completion";
import { syncPlayer } from "@/server/services/player";
import { buildPractice, type PracticeKind } from "@/server/services/practice";
import { abandonLessonAction, completeLessonAction, refillHeartsAction } from "./actions";

export const dynamic = "force-dynamic";

/** Plays a pack lesson, or a practice session at /lesson/practice and /lesson/mistakes. */
export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await requireUser();
  const t = now();
  const player = await syncPlayer(user, t);
  const settings = parseSettings(user.settings);

  let session: { packId: string; title: string; mode: LessonMode; exercises: Exercise[]; exitHref: string };
  if ((PRACTICE_LESSON_IDS as readonly string[]).includes(lessonId)) {
    const practice = await buildPractice(user, lessonId as PracticeKind, t);
    if (!practice) redirect("/practice");
    session = {
      packId: practice.packId,
      title: lessonId === "mistakes" ? "Mistakes review" : "Practice",
      mode: "practice",
      exercises: practice.exercises,
      exitHref: "/practice",
    };
  } else {
    const pack = await getActivePack(user.activePackId);
    if (!pack) notFound();
    const found = findLesson(pack, lessonId);
    if (!found) notFound();
    // Out of hearts: practise to earn one back, or refill in the shop.
    if (player.hearts <= 0) redirect("/practice?hearts=0");
    session = {
      packId: pack.id,
      title: found.lesson.title,
      mode: found.lesson.kind === "checkpoint" ? "checkpoint" : "standard",
      exercises: found.lesson.exercises,
      exitHref: "/learn",
    };
  }

  return (
    <>
      <ClientSettings sound={settings.sound} reduceMotion={settings.reduceMotion} />
      <LessonPlayer
        packId={session.packId}
        lessonId={lessonId}
        title={session.title}
        mode={session.mode}
        exercises={session.exercises}
        hearts={session.mode === "practice" ? null : player.hearts}
        gems={player.wallet.gems}
        exitHref={session.exitHref}
        onComplete={completeLessonAction}
        onAbandon={abandonLessonAction}
        onRefillHearts={refillHeartsAction}
      />
    </>
  );
}
