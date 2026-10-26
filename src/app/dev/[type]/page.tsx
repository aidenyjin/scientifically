import { notFound } from "next/navigation";
import { PreviewPlayer } from "@/components/lesson/PreviewPlayer";
import { buildDemoPack } from "@/content/demo-pack";
import { exerciseCores, type Exercise } from "@/content/registry";

export const dynamic = "force-dynamic";

/**
 * Development preview: /dev/<exercise_type> plays that type's examples
 * straight from code (no DB, nothing saved). /dev/all plays the whole demo pack.
 * Not available in production.
 */
export default async function DevPreview({ params }: { params: Promise<{ type: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { type } = await params;
  const exercises: Exercise[] =
    type === "all"
      ? buildDemoPack().units.flatMap((u) => u.lessons.filter((l) => l.kind === "standard").flatMap((l) => l.exercises))
      : ((exerciseCores.find((c) => c.type === type)?.examples ?? []) as Exercise[]);
  if (exercises.length === 0) notFound();
  return <PreviewPlayer exercises={exercises} title={`Preview: ${type}`} exitHref={`/dev/${type}`} />;
}
