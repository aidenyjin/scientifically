import "server-only";
import { db } from "@/server/db";

export async function getCompletedLessonIds(userId: string, packId: string): Promise<Set<string>> {
  const rows = await db.lessonProgress.findMany({ where: { userId, packId }, select: { lessonId: true } });
  return new Set(rows.map((r) => r.lessonId));
}
