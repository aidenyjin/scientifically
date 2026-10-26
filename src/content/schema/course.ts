import { z } from "zod";
import { exerciseSchema } from "../registry";
import { CHARACTER_IDS, slugSchema } from "./exercise-base";

export const SCHEMA_VERSION = 1;

export const lessonSchema = z.object({
  id: slugSchema,
  title: z.string().min(1).max(60),
  kind: z.enum(["standard", "checkpoint"]).describe("checkpoint = end-of-unit review lesson"),
  objectives: z.array(z.string().min(1)).min(1).max(4),
  exercises: z.array(exerciseSchema).min(1).max(20),
});

export const unitSchema = z.object({
  id: slugSchema,
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .describe("Hex colour for the unit banner; omit to use the default palette"),
  lessons: z.array(lessonSchema).min(1).max(12),
});

const packShape = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: slugSchema,
  title: z.string().min(1).max(80),
  subject: z.string().min(1).max(40),
  level: z.string().min(1).max(60).describe("Audience, e.g. 'Middle school' or 'AP Physics 1'"),
  description: z.string().min(1).max(300),
  units: z.array(unitSchema).min(1).max(20),
});

/** Cross-reference checks that a single exercise schema can't do. */
export function packProblems(pack: z.infer<typeof packShape>): { path: (string | number)[]; message: string }[] {
  const problems: { path: (string | number)[]; message: string }[] = [];
  const seen = new Map<string, string>();
  const claim = (id: string, what: string, path: (string | number)[]) => {
    const prev = seen.get(id);
    if (prev) problems.push({ path, message: `duplicate id "${id}" (also used by a ${prev})` });
    else seen.set(id, what);
  };
  pack.units.forEach((unit, u) => {
    claim(unit.id, "unit", ["units", u, "id"]);
    unit.lessons.forEach((lesson, l) => {
      claim(lesson.id, "lesson", ["units", u, "lessons", l, "id"]);
      lesson.exercises.forEach((ex, e) => {
        claim(ex.id, "exercise", ["units", u, "lessons", l, "exercises", e, "id"]);
        if (ex.characterId && !CHARACTER_IDS.includes(ex.characterId)) {
          problems.push({
            path: ["units", u, "lessons", l, "exercises", e, "characterId"],
            message: `unknown character "${ex.characterId}"`,
          });
        }
      });
    });
  });
  return problems;
}

export const contentPackSchema = packShape.superRefine((pack, ctx) => {
  for (const p of packProblems(pack)) ctx.addIssue({ code: "custom", path: p.path, message: p.message });
});

export type Lesson = z.infer<typeof lessonSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type ContentPack = z.infer<typeof contentPackSchema>;

/** Human-readable list of validation errors, one per line, with JSON paths. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`);
}

export function validatePack(
  input: unknown,
): { ok: true; pack: ContentPack } | { ok: false; errors: string[] } {
  const result = contentPackSchema.safeParse(input);
  return result.success ? { ok: true, pack: result.data } : { ok: false, errors: formatIssues(result.error) };
}
