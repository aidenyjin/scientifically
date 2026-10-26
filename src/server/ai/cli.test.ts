import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildDemoPack } from "@/content/demo-pack";
import type { ContentPack } from "@/content/schema/course";
import { runCli, type CliIo } from "./cli";
import type { GeneratedBy } from "./drafts";
import { createMockProvider } from "./mock";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "sci-cli-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

function captureIo() {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = { out: (l) => out.push(l), err: (l) => err.push(l) };
  return { io, out, err };
}

const GEN_ARGS = ["--subject", "chemistry", "--topic", "acids and bases", "--level", "High school", "--units", "1", "--lessons", "2"];

describe("generate CLI --validate", () => {
  it("passes on the demo pack", async () => {
    const file = path.join(dir, "demo.json");
    await writeFile(file, JSON.stringify(buildDemoPack()));
    const { io, out, err } = captureIo();
    expect(await runCli(["--validate", file], io)).toBe(0);
    expect(out.join("\n")).toMatch(/is valid: pack "demo"/);
    expect(err).toEqual([]);
  });

  it("prints readable errors and exits 1 for a broken pack", async () => {
    // Clone: buildDemoPack() shares the registry's example objects.
    const pack = structuredClone(buildDemoPack());
    (pack.units[0].lessons[0].exercises[1] as { difficulty: number }).difficulty = 9;
    pack.units[0].lessons[1].id = pack.units[0].lessons[0].id;
    const file = path.join(dir, "broken.json");
    await writeFile(file, JSON.stringify(pack));
    const { io, err } = captureIo();
    expect(await runCli(["--validate", file], io)).toBe(1);
    const text = err.join("\n");
    expect(text).toMatch(/units\.0\.lessons\.0\.exercises\.1\.difficulty/);
    expect(text).toMatch(/duplicate id/);
  });

  it("reports invalid JSON and missing files", async () => {
    const file = path.join(dir, "bad.json");
    await writeFile(file, "{ nope");
    const { io, err } = captureIo();
    expect(await runCli(["--validate", file], io)).toBe(1);
    expect(err.join("\n")).toMatch(/not valid JSON/);
    expect(await runCli(["--validate", path.join(dir, "missing.json")], captureIo().io)).toBe(1);
  });
});

describe("generate CLI", () => {
  it("generates with the mock provider, writes --out and the file validates", async () => {
    const file = path.join(dir, "out", "pack.json");
    const { io, out } = captureIo();
    const code = await runCli([...GEN_ARGS, "--out", file], io, { provider: createMockProvider() });
    expect(code).toBe(0);
    expect(out.join("\n")).toMatch(/Outline ready/);
    expect(out.join("\n")).toMatch(/Tokens: [\d,]+ input \+ [\d,]+ output/);
    const pack = JSON.parse(await readFile(file, "utf8")) as ContentPack;
    expect(pack.units[0].lessons).toHaveLength(3);
    expect(await runCli(["--validate", file], captureIo().io)).toBe(0);
  });

  it("--save hands the pack and generatedBy (params, outline, needsReview) to the store", async () => {
    let saved: { pack: ContentPack; generatedBy: GeneratedBy } | null = null;
    const code = await runCli([...GEN_ARGS, "--save", "--types", "multiple_choice,true_false", "--no-checkpoints"], captureIo().io, {
      provider: createMockProvider(),
      saveDraft: async (pack, generatedBy) => {
        saved = { pack, generatedBy };
        return pack.id;
      },
    });
    expect(code).toBe(0);
    expect(saved).not.toBeNull();
    const { pack, generatedBy } = saved!;
    expect(pack.units[0].lessons.every((l) => l.kind === "standard")).toBe(true);
    expect(generatedBy).toMatchObject({ source: "cli", provider: "mock", needsReview: [], failedLessons: [] });
    expect(generatedBy.params.types).toEqual(["multiple_choice", "true_false"]);
    expect(generatedBy.outline?.units).toHaveLength(1);
  });

  it("exits 2 with readable messages for bad options", async () => {
    const missing = captureIo();
    expect(await runCli(["--subject", "chemistry"], missing.io)).toBe(2);
    expect(missing.err.join("\n")).toMatch(/topic/);
    const typo = captureIo();
    expect(await runCli([...GEN_ARGS, "--units", "two"], typo.io)).toBe(2);
    expect(typo.err.join("\n")).toMatch(/--units must be a whole number/);
    expect(await runCli([...GEN_ARGS, "--types", "essay"], captureIo().io)).toBe(2);
    expect(await runCli(["--bogus"], captureIo().io)).toBe(2);
  });

  it("exits 1 with a clear message when the API key is missing", async () => {
    const { io, err } = captureIo();
    expect(await runCli(GEN_ARGS, io, { env: { AI_PROVIDER: "anthropic" } })).toBe(1);
    expect(err.join("\n")).toMatch(/ANTHROPIC_API_KEY is not set/);
  });
});
