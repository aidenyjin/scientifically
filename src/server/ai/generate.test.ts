import { describe, expect, it } from "vitest";
import { validatePack } from "@/content/schema/course";
import { AiAbortError, BudgetExceededError, GenerationError } from "./errors";
import { generatePack, regenerateLesson, resolveTypes, withUniqueIds, type LogLevel } from "./generate";
import { createMockProvider, mockOutline, type MockFault } from "./mock";
import type { AiRequest } from "./provider";
import { generationParamsSchema, type GenerationParamsInput, type Usage } from "./schemas";
import { checkPack } from "./validate";

const PARAMS: GenerationParamsInput = {
  subject: "chemistry",
  topic: "acids and bases",
  level: "High school",
  units: 2,
  lessonsPerUnit: 2,
  exercisesPerLesson: 8,
};

/** Lesson ids the mock outline will produce for `params`, in order. */
function lessonIds(params: GenerationParamsInput = PARAMS): string[] {
  const parsed = generationParamsSchema.parse(params);
  return mockOutline(parsed, resolveTypes(parsed))
    .units.flatMap((u) => u.lessons.map((l) => l.id));
}

const lessonCalls = (calls: AiRequest[], lessonId: string) =>
  calls.filter((c) => c.meta?.stage === "lesson" && c.meta.lesson.id === lessonId);

function collectLogs() {
  const logs: { level: LogLevel; message: string }[] = [];
  return { logs, onLog: (level: LogLevel, message: string) => logs.push({ level, message }) };
}

describe("generatePack (mock provider)", () => {
  it("happy path: outline → lessons → a pack that passes validatePack", async () => {
    const provider = createMockProvider();
    const { logs, onLog } = collectLogs();
    let outlineSeen = false;
    let lastUsage: Usage | null = null;
    const result = await generatePack(PARAMS, {
      provider,
      onLog,
      onOutline: () => {
        outlineSeen = true;
      },
      onUsage: (total) => {
        lastUsage = total;
      },
    });

    expect(validatePack(result.pack)).toMatchObject({ ok: true });
    expect(checkPack(result.pack).errors).toEqual([]);
    expect(result.needsReview).toEqual([]);
    expect(result.failedLessons).toEqual([]);
    expect(result.pack.units).toHaveLength(2);
    for (const unit of result.pack.units) {
      expect(unit.lessons.map((l) => l.kind)).toEqual(["standard", "standard", "checkpoint"]);
      for (const lesson of unit.lessons) expect(lesson.exercises).toHaveLength(8);
    }
    expect(result.pack.units[0].lessons[0].exercises[0].type).toBe("info_card");
    expect(result.pack.subject).toBe("chemistry");
    expect(result.pack.level).toBe("High school");

    const ids = result.pack.units.flatMap((u) => [u.id, ...u.lessons.flatMap((l) => [l.id, ...l.exercises.map((e) => e.id)])]);
    expect(new Set(ids).size).toBe(ids.length);

    expect(outlineSeen).toBe(true);
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(lastUsage).toEqual(result.usage);
    expect(provider.calls).toHaveLength(1 + 6);
    expect(provider.calls[0].schemaName).toBe("course_outline");
    expect(provider.calls.slice(1).every((c) => c.schemaName === "lesson")).toBe(true);
    // One stable system prompt for every call of the job (prompt caching).
    expect(new Set(provider.calls.map((c) => c.system)).size).toBe(1);
    expect(logs.some((l) => l.message.startsWith("Outline ready"))).toBe(true);
    expect(logs.filter((l) => l.level !== "info").map((l) => l.message).filter((m) => !m.startsWith("Skipping"))).toEqual([]);
  });

  it("respects the allowed types (plus info_card) and checkpoint switch", async () => {
    const result = await generatePack(
      { ...PARAMS, units: 1, types: ["true_false"], includeCheckpoints: false },
      { provider: createMockProvider() },
    );
    const types = new Set(result.pack.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises.map((e) => e.type))));
    expect([...types].sort()).toEqual(["info_card", "true_false"]);
    expect(result.pack.units[0].lessons.every((l) => l.kind === "standard")).toBe(true);
  });

  it("retry path: a schema-invalid first reply is fixed on the second attempt, with the exact errors sent back", async () => {
    const [first] = lessonIds();
    const faults: MockFault[] = [{ stage: "lesson", lessonId: first, attempts: [0], break: "schema" }];
    const provider = createMockProvider({ faults });
    const { logs, onLog } = collectLogs();
    const result = await generatePack(PARAMS, { provider, onLog });

    expect(result.needsReview).toEqual([]);
    const calls = lessonCalls(provider.calls, first);
    expect(calls).toHaveLength(2);
    expect(calls[1].prompt).toContain("Your previous attempt had problems");
    expect(calls[1].prompt).toMatch(/exercises\.\d+ \("[^"]+", [a-z_]+\): difficulty: /);
    expect(calls[1].meta).toMatchObject({ attempt: 1 });
    expect(logs.some((l) => l.level === "warn" && l.message.includes(`Lesson "${first}" attempt 1`))).toBe(true);
    expect(validatePack(result.pack).ok).toBe(true);
  });

  it("retry path: autoCheck problems and unparseable replies are retried too", async () => {
    const params = { ...PARAMS, units: 1, types: ["multiple_choice", "true_false"] } satisfies GenerationParamsInput;
    const [first, second] = lessonIds(params);
    const provider = createMockProvider({
      faults: [
        { stage: "lesson", lessonId: first, attempts: [0], break: "autocheck" },
        { stage: "lesson", lessonId: second, attempts: [0], break: "invalid-json" },
      ],
    });
    const result = await generatePack(params, { provider });
    expect(result.needsReview).toEqual([]);
    expect(lessonCalls(provider.calls, first)[1].prompt).toContain("options contain duplicates");
    expect(lessonCalls(provider.calls, second)[1].prompt).toContain("(reply): The reply was not valid JSON.");
  });

  it("a lesson that stays broken keeps its valid exercises and is flagged needsReview", async () => {
    const [first] = lessonIds();
    const provider = createMockProvider({ faults: [{ stage: "lesson", lessonId: first, break: "schema" }] });
    const result = await generatePack(PARAMS, { provider });

    expect(lessonCalls(provider.calls, first)).toHaveLength(3);
    const lesson = result.pack.units[0].lessons.find((l) => l.id === first)!;
    expect(lesson.exercises).toHaveLength(7);
    expect(result.needsReview).toHaveLength(1);
    expect(result.needsReview[0].lessonId).toBe(first);
    expect(result.needsReview[0].exerciseId).toMatch(new RegExp(`^${first}-`));
    expect(result.needsReview[0].errors.join(" ")).toMatch(/difficulty/);
    expect(lesson.exercises.some((e) => e.id === result.needsReview[0].exerciseId)).toBe(false);
    expect(validatePack(result.pack).ok).toBe(true);
  });

  it("a lesson with fewer than 5 valid exercises fails clearly and is left out", async () => {
    const ids = lessonIds();
    const provider = createMockProvider({ faults: [{ stage: "lesson", lessonId: ids[1], break: "too-few", keep: 3 }] });
    const { logs, onLog } = collectLogs();
    const result = await generatePack(PARAMS, { provider, onLog });

    expect(result.failedLessons).toHaveLength(1);
    expect(result.failedLessons[0]).toMatchObject({ lessonId: ids[1], unitId: result.pack.units[0].id });
    expect(result.failedLessons[0].errors.join(" ")).toMatch(/expected 8 exercises, got 3/);
    expect(result.pack.units[0].lessons.map((l) => l.id)).not.toContain(ids[1]);
    expect(logs.some((l) => l.level === "error" && l.message.includes("failed after 3 attempts"))).toBe(true);
    expect(validatePack(result.pack).ok).toBe(true);
  });

  it("aborts when usage exceeds maxTotalTokens", async () => {
    // Measure the outline and first lesson call, then set the budget in between.
    const deltas: Usage[] = [];
    await generatePack(PARAMS, { provider: createMockProvider(), concurrency: 1, onUsage: (_t, d) => deltas.push(d) });
    const tokens = (u: Usage) => u.inputTokens + u.outputTokens;
    const budget = tokens(deltas[0]) + Math.floor(tokens(deltas[1]) / 2);

    const provider = createMockProvider();
    const { logs, onLog } = collectLogs();
    const run = generatePack({ ...PARAMS, maxTotalTokens: budget }, { provider, concurrency: 1, onLog });
    await expect(run).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(run).rejects.toThrow(/Token budget exceeded/);
    expect(provider.calls).toHaveLength(2);
    expect(logs.some((l) => l.level === "error" && l.message.includes("budget"))).toBe(true);
  });

  it("stops in-flight lessons once the budget is gone (concurrency 3)", async () => {
    const provider = createMockProvider({ delayMs: 5 });
    const run = generatePack({ ...PARAMS, maxTotalTokens: 1 }, { provider });
    await expect(run).rejects.toBeInstanceOf(BudgetExceededError);
    expect(provider.calls).toHaveLength(1); // only the outline call was made
  });

  it("honours an abort signal", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(generatePack(PARAMS, { provider: createMockProvider(), signal: controller.signal })).rejects.toBeInstanceOf(
      AiAbortError,
    );
  });

  it("rejects invalid params with readable issues", async () => {
    await expect(generatePack({ ...PARAMS, units: 0 }, { provider: createMockProvider() })).rejects.toThrow(
      /Invalid generation parameters[\s\S]*units/,
    );
  });

  it("normalises the outline: trims extra lessons, adds a missing checkpoint, de-duplicates ids", async () => {
    const provider = createMockProvider({
      faults: [
        {
          stage: "outline",
          break: (output) => {
            const o = output as { units: { id: string; lessons: { id: string; kind: string }[] }[] };
            const unit = o.units[0];
            unit.lessons = unit.lessons.filter((l) => l.kind !== "checkpoint");
            unit.lessons.push({ ...unit.lessons[0], id: "extra-lesson" });
            o.units[1].lessons[0].id = unit.lessons[0].id; // duplicate id across units
            return o;
          },
        },
      ],
    });
    const { logs, onLog } = collectLogs();
    const result = await generatePack(PARAMS, { provider, onLog });
    const unit = result.pack.units[0];
    expect(unit.lessons.map((l) => l.kind)).toEqual(["standard", "standard", "checkpoint"]);
    expect(unit.lessons.map((l) => l.id)).not.toContain("extra-lesson");
    expect(logs.some((l) => l.message.includes("had no checkpoint; adding one"))).toBe(true);
    expect(logs.some((l) => l.message.includes("renamed duplicate id"))).toBe(true);
    expect(validatePack(result.pack).ok).toBe(true);
  });

  it("retries an invalid outline with the errors, and gives up after 3 attempts", async () => {
    const once = createMockProvider({ faults: [{ stage: "outline", attempts: [0], break: () => ({ title: "Only a title" }) }] });
    const result = await generatePack({ ...PARAMS, units: 1 }, { provider: once });
    expect(once.calls[1].schemaName).toBe("course_outline");
    expect(once.calls[1].prompt).toMatch(/Problems:\n- description: /);
    expect(result.pack.units).toHaveLength(1);

    const always = createMockProvider({ faults: [{ stage: "outline", break: () => ({ units: [] }) }] });
    await expect(generatePack(PARAMS, { provider: always })).rejects.toBeInstanceOf(GenerationError);
    expect(always.calls).toHaveLength(3);
  });

  it("enforces unique exercise ids across the pack", async () => {
    const provider = createMockProvider({
      faults: [
        {
          stage: "lesson",
          break: (output) => {
            const lesson = output as { exercises: { id: string }[] };
            lesson.exercises.forEach((e, i) => (e.id = `shared-${i}`));
            return lesson;
          },
        },
      ],
    });
    const result = await generatePack(PARAMS, { provider });
    const ids = result.pack.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises.map((e) => e.id)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("shared-0");
    expect(ids.some((id) => id.endsWith("-shared-0"))).toBe(true);
    expect(validatePack(result.pack).ok).toBe(true);
  });
});

describe("withUniqueIds", () => {
  it("prefixes colliding ids with the lesson id, then numbers them", () => {
    const taken = new Set(["a", "l1-a"]);
    const lesson = withUniqueIds(
      {
        id: "l1",
        title: "L",
        kind: "standard",
        objectives: ["x"],
        exercises: [
          { id: "a", type: "true_false", prompt: "p", statement: "s", answer: true, explanation: "e", skillTags: ["t"], difficulty: 1 },
          { id: "b", type: "true_false", prompt: "p", statement: "s", answer: true, explanation: "e", skillTags: ["t"], difficulty: 1 },
        ],
      },
      taken,
    );
    expect(lesson.exercises.map((e) => e.id)).toEqual(["l1-a-2", "b"]);
  });
});

describe("regenerateLesson", () => {
  it("replaces one lesson in place, passing reviewer notes to the model", async () => {
    const { pack } = await generatePack(PARAMS, { provider: createMockProvider() });
    const target = pack.units[1].lessons[1];
    const provider = createMockProvider();
    const result = await regenerateLesson(pack, target.id, PARAMS, provider, { notes: "Make it harder." });

    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0].prompt).toContain("Make it harder.");
    expect(provider.calls[0].prompt).toContain(`"id": "${target.id}"`);
    expect(result.pack.units[1].lessons[1].id).toBe(target.id);
    expect(result.pack.units.map((u) => u.lessons.length)).toEqual(pack.units.map((u) => u.lessons.length));
    expect(validatePack(result.pack).ok).toBe(true);
    expect(result.needsReview).toEqual([]);
  });

  it("re-creates a lesson that failed, at its outline position, using the job outline", async () => {
    const ids = lessonIds();
    const broken = createMockProvider({ faults: [{ stage: "lesson", lessonId: ids[0], break: "too-few" }] });
    const first = await generatePack(PARAMS, { provider: broken });
    expect(first.pack.units[0].lessons.map((l) => l.id)).not.toContain(ids[0]);

    const result = await regenerateLesson(first.pack, ids[0], PARAMS, createMockProvider(), { outline: first.outline });
    expect(result.pack.units[0].lessons[0].id).toBe(ids[0]);
    expect(validatePack(result.pack).ok).toBe(true);
  });

  it("throws for a lesson that isn't in the pack or outline", async () => {
    const { pack } = await generatePack({ ...PARAMS, units: 1 }, { provider: createMockProvider() });
    await expect(regenerateLesson(pack, "nope", PARAMS, createMockProvider())).rejects.toBeInstanceOf(GenerationError);
  });
});
