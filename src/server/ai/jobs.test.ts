import { beforeEach, describe, expect, it, vi } from "vitest";
import { validatePack, type ContentPack } from "@/content/schema/course";
import type { GeneratedBy } from "./drafts";
import { createMockProvider } from "./mock";
import type { AiProvider } from "./provider";

// In-memory stand-ins for the Prisma client and the packs repo.
const store = vi.hoisted(() => {
  type JobRow = {
    id: string;
    params: string;
    status: string;
    log: string;
    outline: string | null;
    packId: string | null;
    inputTokens: number;
    outputTokens: number;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  type PackRow = { id: string; status: string; json: string; generatedBy: string };
  const jobs = new Map<string, JobRow>();
  const packs = new Map<string, PackRow>();
  const statusHistory: string[] = [];
  let n = 0;
  const db = {
    generationJob: {
      create: async ({ data }: { data: Pick<JobRow, "params" | "status" | "log"> }) => {
        const row: JobRow = {
          id: `job-${++n}`,
          outline: null,
          packId: null,
          inputTokens: 0,
          outputTokens: 0,
          error: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        jobs.set(row.id, row);
        return { id: row.id };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = jobs.get(where.id);
        return row ? { ...row } : null;
      },
      findMany: async () => [...jobs.values()],
      update: async ({ where, data }: { where: { id: string }; data: Partial<JobRow> }) => {
        const row = jobs.get(where.id)!;
        Object.assign(row, data, { updatedAt: new Date() });
        if (statusHistory.at(-1) !== row.status) statusHistory.push(row.status);
        return row;
      },
    },
    contentPack: {
      findUnique: async ({ where }: { where: { id: string } }) => packs.get(where.id) ?? null,
    },
  };
  const savePack = async (pack: { id: string }, status: string, generatedBy: object) => {
    packs.set(pack.id, { id: pack.id, status, json: JSON.stringify(pack), generatedBy: JSON.stringify(generatedBy) });
  };
  return { jobs, packs, statusHistory, db, savePack, reset: () => (jobs.clear(), packs.clear(), (statusHistory.length = 0)) };
});

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: store.db }));
vi.mock("@/server/repo/packs", () => ({ savePack: vi.fn(store.savePack) }));

const { createGenerationJob, getJob, regeneratePackLesson, runGenerationJob } = await import("./jobs");

const PARAMS = { subject: "biology", topic: "cells", level: "Middle school", units: 1, lessonsPerUnit: 2, exercisesPerLesson: 8 };

beforeEach(() => store.reset());

describe("generation jobs", () => {
  it("runs queued → outlining → generating → done and saves a draft pack", async () => {
    const id = await createGenerationJob(PARAMS);
    expect((await getJob(id))?.status).toBe("queued");

    const result = await runGenerationJob(id, { provider: createMockProvider() });
    expect(result.status).toBe("done");
    expect(store.statusHistory).toEqual(["outlining", "generating", "done"]);

    const job = (await getJob(id))!;
    expect(job.status).toBe("done");
    expect(job.packId).toBe(result.packId);
    expect(job.outline?.units).toHaveLength(1);
    expect(job.inputTokens).toBeGreaterThan(0);
    expect(job.outputTokens).toBeGreaterThan(0);
    expect(job.error).toBeNull();
    expect(job.progress).toEqual({ done: 3, total: 3 });
    expect(job.log.map((e) => e.message).join("\n")).toMatch(/Outline ready[\s\S]*Saved draft pack/);
    expect(job.params?.topic).toBe("cells");

    const saved = store.packs.get(result.packId!)!;
    expect(saved.status).toBe("draft");
    expect(validatePack(JSON.parse(saved.json)).ok).toBe(true);
    const generatedBy = JSON.parse(saved.generatedBy) as GeneratedBy;
    expect(generatedBy).toMatchObject({ provider: "mock", jobId: id, needsReview: [], failedLessons: [] });
  });

  it("records failures on the row instead of throwing", async () => {
    const id = await createGenerationJob(PARAMS);
    const broken: AiProvider = {
      name: "broken",
      model: "x",
      generateJSON: async () => {
        throw new Error("The API is down");
      },
    };
    const result = await runGenerationJob(id, { provider: broken });
    expect(result).toEqual({ status: "failed", error: "The API is down" });
    const job = (await getJob(id))!;
    expect(job.status).toBe("failed");
    expect(job.error).toBe("The API is down");
    expect(job.log.at(-1)).toMatchObject({ level: "error", message: "The API is down" });
    await expect(runGenerationJob(id)).rejects.toThrow(/already failed/);
  });

  it("never overwrites a published pack with the same id", async () => {
    store.packs.set("cells-course", { id: "cells-course", status: "published", json: "{}", generatedBy: "{}" });
    const id = await createGenerationJob({ ...PARAMS, packId: "cells-course" });
    const result = await runGenerationJob(id, { provider: createMockProvider() });
    expect(result.packId).toBe("cells-course-2");
    expect(store.packs.get("cells-course")?.status).toBe("published");
  });

  it("rejects invalid params up front", async () => {
    await expect(createGenerationJob({ ...PARAMS, exercisesPerLesson: 40 })).rejects.toThrow(/exercisesPerLesson/);
  });

  it("regenerates one lesson of a stored pack and updates needsReview", async () => {
    const id = await createGenerationJob(PARAMS);
    const { packId } = await runGenerationJob(id, { provider: createMockProvider() });
    const before = JSON.parse(store.packs.get(packId!)!.json) as ContentPack;
    const lessonId = before.units[0].lessons[0].id;

    const provider = createMockProvider({ faults: [{ stage: "lesson", break: "schema" }] });
    const result = await regeneratePackLesson(packId!, lessonId, { provider, notes: "Shorter prompts" });
    expect(result.needsReview).toHaveLength(1);
    expect(provider.calls[0].prompt).toContain("Shorter prompts");
    const row = store.packs.get(packId!)!;
    expect(row.status).toBe("draft");
    const generatedBy = JSON.parse(row.generatedBy) as GeneratedBy & { lastRegenerated: { lessonId: string } };
    expect(generatedBy.needsReview).toHaveLength(1);
    expect(generatedBy.lastRegenerated.lessonId).toBe(lessonId);
    expect(generatedBy.jobId).toBe(id);
    expect(validatePack(JSON.parse(row.json)).ok).toBe(true);
  });
});
