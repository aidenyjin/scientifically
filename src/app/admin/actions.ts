"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Exercise } from "@/content/registry";
import { contentPackSchema, type ContentPack } from "@/content/schema/course";
import { assertAdmin, loginAdmin, logoutAdmin } from "@/server/admin/auth";
import { safeAdminNext } from "@/server/admin/token";
import { createApiKey, revokeApiKey } from "@/server/agent/api-keys";
import { buildAgentPrompt, mcpUrl } from "@/server/agent/guide";
import { publicOrigin } from "@/server/agent/origin";
import {
  cancelGenerationJob,
  checkPack,
  checkPackJson,
  exerciseTypeSchema,
  generationParamsSchema,
  getJob,
  regeneratePackLesson,
  startGenerationJob,
  type GenerationJobView,
} from "@/server/ai";
import { db } from "@/server/db";
import { savePack, type PackStatus } from "@/server/repo/packs";

export type ActionResult = { ok: true; message?: string } | { ok: false; errors: string[] };

// ---------------------------------------------------------------- auth

export async function adminLoginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const ok = await loginAdmin(String(formData.get("password") ?? ""));
  if (!ok) return { error: "Wrong password." };
  redirect(safeAdminNext(formData.get("next")));
}

export async function adminLogoutAction(): Promise<void> {
  await logoutAdmin();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- generation

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));
const str = (v: FormDataEntryValue | null) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

export async function startGenerationAction(
  _prev: { errors?: string[] } | undefined,
  formData: FormData,
): Promise<{ errors?: string[] }> {
  await assertAdmin();
  const types = formData.getAll("types").map(String);
  const parsed = generationParamsSchema.safeParse({
    subject: str(formData.get("subject")),
    topic: str(formData.get("topic")),
    level: str(formData.get("level")),
    units: num(formData.get("units")),
    lessonsPerUnit: num(formData.get("lessonsPerUnit")),
    exercisesPerLesson: num(formData.get("exercisesPerLesson")),
    types: types.length ? types.filter((t) => exerciseTypeSchema.safeParse(t).success) : undefined,
    tone: str(formData.get("tone")),
    notes: str(formData.get("notes")),
    packId: str(formData.get("packId")),
    includeCheckpoints: formData.get("includeCheckpoints") === "on",
    maxTotalTokens: num(formData.get("maxTotalTokens")),
  });
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "form"}: ${i.message}`),
    };
  }
  const id = await startGenerationJob(parsed.data);
  redirect(`/admin/jobs/${id}`);
}

/** JSON-safe job view for polling. */
export type JobSnapshot = Omit<GenerationJobView, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export async function getJobAction(id: string): Promise<JobSnapshot | null> {
  await assertAdmin();
  const job = await getJob(id);
  return job
    ? { ...job, createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString() }
    : null;
}

export async function cancelJobAction(id: string): Promise<{ ok: boolean }> {
  await assertAdmin();
  return { ok: cancelGenerationJob(id) };
}

// ---------------------------------------------------------------- packs

async function loadPack(
  id: string,
): Promise<{ pack: ContentPack; status: PackStatus; generatedBy: object } | null> {
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) return null;
  const parsed = contentPackSchema.safeParse(JSON.parse(row.json));
  if (!parsed.success) return null;
  let generatedBy: object = {};
  try {
    generatedBy = JSON.parse(row.generatedBy) as object;
  } catch {
    // keep {}
  }
  return { pack: parsed.data, status: row.status as PackStatus, generatedBy };
}

export async function setPackStatusAction(id: string, status: PackStatus): Promise<ActionResult> {
  await assertAdmin();
  const loaded = await loadPack(id);
  if (!loaded) return { ok: false, errors: ["Pack not found or invalid."] };
  if (status === "published") {
    const check = checkPack(loaded.pack);
    if (!check.ok)
      return {
        ok: false,
        errors: ["Fix these problems before publishing:", ...check.errors.slice(0, 20)],
      };
  }
  await db.contentPack.update({ where: { id }, data: { status } });
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
  return {
    ok: true,
    message:
      status === "published" ? "Published — learners can see it now." : `Moved to ${status}.`,
  };
}

export async function deletePackAction(id: string): Promise<void> {
  await assertAdmin();
  await db.contentPack.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function importPackAction(
  _prev: { errors?: string[]; packId?: string } | undefined,
  formData: FormData,
): Promise<{ errors?: string[]; packId?: string }> {
  await assertAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { errors: ["Choose a .json file to import."] };
  if (file.size > 5_000_000) return { errors: ["That file is larger than 5 MB."] };
  const check = checkPackJson(await file.text());
  if (!check.pack) return { errors: check.errors.slice(0, 30) };
  const pack = check.pack;
  // Never overwrite an existing pack on import.
  let id = pack.id;
  for (let n = 2; await db.contentPack.findUnique({ where: { id } }); n++) id = `${pack.id}-${n}`;
  await savePack({ ...pack, id }, "draft", {
    source: "import",
    importedAt: new Date().toISOString(),
  });
  revalidatePath("/admin");
  redirect(`/admin/packs/${id}`);
}

function replaceExercise(pack: ContentPack, exerciseId: string, next: Exercise | null): boolean {
  for (const unit of pack.units)
    for (const lesson of unit.lessons) {
      const i = lesson.exercises.findIndex((e) => e.id === exerciseId);
      if (i === -1) continue;
      if (next) lesson.exercises[i] = next;
      else lesson.exercises.splice(i, 1);
      return true;
    }
  return false;
}

export async function updateExerciseAction(
  packId: string,
  exerciseId: string,
  json: string,
): Promise<ActionResult> {
  await assertAdmin();
  const loaded = await loadPack(packId);
  if (!loaded) return { ok: false, errors: ["Pack not found or invalid."] };
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    return { ok: false, errors: [`Not valid JSON — ${(error as Error).message}`] };
  }
  const pack = structuredClone(loaded.pack);
  if (!replaceExercise(pack, exerciseId, value as Exercise))
    return { ok: false, errors: ["Exercise not found."] };
  const check = checkPack(pack);
  if (!check.pack) return { ok: false, errors: check.errors.slice(0, 20) };
  const ownErrors = check.errors.filter((e) =>
    e.includes(`"${(value as { id?: string }).id ?? exerciseId}"`),
  );
  if (ownErrors.length) return { ok: false, errors: ownErrors };
  await savePack(check.pack, loaded.status, loaded.generatedBy);
  revalidatePath(`/admin/packs/${packId}`);
  return { ok: true, message: "Saved." };
}

export async function deleteExerciseAction(
  packId: string,
  exerciseId: string,
): Promise<ActionResult> {
  await assertAdmin();
  const loaded = await loadPack(packId);
  if (!loaded) return { ok: false, errors: ["Pack not found or invalid."] };
  const pack = structuredClone(loaded.pack);
  if (!replaceExercise(pack, exerciseId, null))
    return { ok: false, errors: ["Exercise not found."] };
  const check = checkPack(pack);
  if (!check.pack)
    return {
      ok: false,
      errors: ["A lesson needs at least one exercise.", ...check.errors.slice(0, 5)],
    };
  await savePack(check.pack, loaded.status, loaded.generatedBy);
  revalidatePath(`/admin/packs/${packId}`);
  return { ok: true, message: "Deleted." };
}

export async function regenerateLessonAction(
  packId: string,
  lessonId: string,
  notes: string,
): Promise<ActionResult> {
  await assertAdmin();
  try {
    const result = await regeneratePackLesson(packId, lessonId, {
      notes: notes.trim() || undefined,
    });
    revalidatePath(`/admin/packs/${packId}`);
    return {
      ok: true,
      message: `Regenerated "${result.lesson.title}" (${result.lesson.exercises.length} exercises, ${
        result.usage.inputTokens + result.usage.outputTokens
      } tokens).`,
    };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Regeneration failed."] };
  }
}

// ---------------------------------------------------------------- agent keys

/** A new key and the ready-to-paste text built around it. Shown once. */
export type NewAgentKey = {
  name: string;
  key: string;
  canPublish: boolean;
  prompt: string;
  connectorUrl: string;
  claudeCode: string;
};

export async function createAgentKeyAction(
  _prev: { errors?: string[]; created?: NewAgentKey } | undefined,
  formData: FormData,
): Promise<{ errors?: string[]; created?: NewAgentKey }> {
  await assertAdmin();
  const name = str(formData.get("name"));
  if (!name) return { errors: ["Give the key a name, e.g. the agent that will use it."] };
  if (name.length > 60) return { errors: ["Keep the name under 60 characters."] };
  const canPublish = formData.get("canPublish") === "on";
  const { key } = await createApiKey({ name, canPublish });
  const origin = publicOrigin(await headers());
  revalidatePath("/admin/agents");
  return {
    created: {
      name,
      key,
      canPublish,
      prompt: buildAgentPrompt({ origin, key }),
      connectorUrl: mcpUrl(origin, key),
      claudeCode: `claude mcp add --transport http scientifically ${mcpUrl(origin)} --header "Authorization: Bearer ${key}"`,
    },
  };
}

export async function revokeAgentKeyAction(id: string): Promise<void> {
  await assertAdmin();
  await revokeApiKey(id);
  revalidatePath("/admin/agents");
}
