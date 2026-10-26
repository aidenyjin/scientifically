import "server-only";
import { contentPackSchema, type ContentPack, type Lesson, type Unit } from "@/content/schema/course";
import { db } from "@/server/db";

export type PackStatus = "draft" | "published" | "archived";

export async function listPacks(status?: PackStatus) {
  return db.contentPack.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, subject: true, level: true, status: true, createdAt: true, updatedAt: true },
  });
}

export async function getPack(id: string): Promise<ContentPack | null> {
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) return null;
  const parsed = contentPackSchema.safeParse(JSON.parse(row.json));
  return parsed.success ? parsed.data : null;
}

/** The pack the user is studying: their chosen one, else the first published. */
export async function getActivePack(activePackId: string | null): Promise<ContentPack | null> {
  if (activePackId) {
    const row = await db.contentPack.findUnique({ where: { id: activePackId }, select: { status: true } });
    if (row?.status === "published") return getPack(activePackId);
  }
  const first = await db.contentPack.findFirst({ where: { status: "published" }, orderBy: { createdAt: "asc" } });
  return first ? getPack(first.id) : null;
}

export async function savePack(pack: ContentPack, status: PackStatus, generatedBy: object = {}) {
  const data = {
    title: pack.title,
    subject: pack.subject,
    level: pack.level,
    status,
    json: JSON.stringify(pack),
    generatedBy: JSON.stringify(generatedBy),
  };
  return db.contentPack.upsert({ where: { id: pack.id }, update: data, create: { id: pack.id, ...data } });
}

export interface LessonLocation {
  unit: Unit;
  lesson: Lesson;
  unitIndex: number;
  lessonIndex: number;
}

export function findLesson(pack: ContentPack, lessonId: string): LessonLocation | null {
  for (const [unitIndex, unit] of pack.units.entries()) {
    const lessonIndex = unit.lessons.findIndex((l) => l.id === lessonId);
    if (lessonIndex !== -1) return { unit, lesson: unit.lessons[lessonIndex], unitIndex, lessonIndex };
  }
  return null;
}

/** All lessons in path order. */
export function flatLessons(pack: ContentPack): LessonLocation[] {
  return pack.units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, lessonIndex) => ({ unit, lesson, unitIndex, lessonIndex })),
  );
}
