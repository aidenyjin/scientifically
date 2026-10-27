import { beforeAll, describe, expect, it } from "vitest";
import { getCore, type Exercise } from "@/content/registry";
import type { ContentPack, Unit } from "@/content/schema/course";
import { setupTempDatabase } from "@/test/db";
import { examplePack } from "./guide";

setupTempDatabase();

// Imported after the DB env is set.
const { db } = await import("@/server/db");
const { savePack } = await import("@/server/repo/packs");
const { authenticateApiKey, createApiKey, revokeApiKey } = await import("./api-keys");
const { AgentApiError, createPack, getPack, listPacks, putUnit, updatePack, validatePack } = await import("./service");
const { agentMcpServer } = await import("./tools");
const { handleMcpPayload } = await import("./mcp");

const ORIGIN = "https://sci.example.com";
type Caller = NonNullable<Awaited<ReturnType<typeof authenticateApiKey>>>;
let publisher: Caller;
let drafter: Caller;

async function caller(name: string, canPublish: boolean): Promise<Caller> {
  const { key } = await createApiKey({ name, canPublish });
  const c = await authenticateApiKey(key);
  if (!c) throw new Error("key did not authenticate");
  return c;
}

function pack(id: string): ContentPack {
  return { ...examplePack(), id };
}

/** A second unit whose multiple-choice question has duplicate options (an autoCheck problem). */
function unitWithProblem(id: string): Unit {
  const mc = getCore("multiple_choice").examples[0] as Extract<Exercise, { type: "multiple_choice" }>;
  return {
    id,
    title: "Floating and sinking",
    description: "Why boats float.",
    lessons: [
      {
        id: `${id}-lesson`,
        title: "Will it float?",
        kind: "standard",
        objectives: ["Predict whether an object floats"],
        exercises: [{ ...mc, id: `${id}-lesson-1-mc`, options: ["Sinks", "sinks", "Floats"] }],
      },
    ],
  };
}

async function rejects(promise: Promise<unknown>, status: number) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AgentApiError);
  expect((error as InstanceType<typeof AgentApiError>).status).toBe(status);
  return error as InstanceType<typeof AgentApiError>;
}

beforeAll(async () => {
  publisher = await caller("Claude", true);
  drafter = await caller("Drafts only", false);
  await savePack(pack("admin-made"), "published", { source: "import" });
});

describe("agent API keys", () => {
  it("stops authenticating a key once it is revoked", async () => {
    const { id, key } = await createApiKey({ name: "temp", canPublish: true });
    expect(await authenticateApiKey(key)).toMatchObject({ keyName: "temp", canPublish: true });
    await revokeApiKey(id);
    expect(await authenticateApiKey(key)).toBeNull();
    expect(await authenticateApiKey("sci_" + "x".repeat(32))).toBeNull();
    expect(await authenticateApiKey(null)).toBeNull();
  });

  it("never stores the plain key", async () => {
    const { id, key } = await createApiKey({ name: "stored", canPublish: false });
    const row = await db.apiKey.findUniqueOrThrow({ where: { id } });
    expect(JSON.stringify(row)).not.toContain(key);
    expect(row.prefix).toBe(key.slice(0, 8));
  });
});

describe("agent pack service", () => {
  it("creates a draft by default, recording which key made it", async () => {
    const result = await createPack(publisher, { pack: pack("density-a") }, ORIGIN);
    expect(result).toMatchObject({
      id: "density-a",
      status: "draft",
      problems: [],
      stats: { units: 1, lessons: 1, exercises: 2 },
      adminUrl: `${ORIGIN}/admin/packs/density-a`,
    });
    const row = await db.contentPack.findUniqueOrThrow({ where: { id: "density-a" } });
    expect(JSON.parse(row.generatedBy)).toMatchObject({ source: "agent", keyId: publisher.keyId, keyName: "Claude" });
  });

  it("never overwrites an existing pack on create", async () => {
    const result = await createPack(publisher, { pack: pack("admin-made") }, ORIGIN);
    expect(result.id).toBe("admin-made-2");
    expect((await getPack(publisher, "admin-made")).pack).toMatchObject({ id: "admin-made" });
  });

  it("rejects schema errors without saving anything", async () => {
    const broken = { ...pack("broken-pack"), units: [] };
    const error = await rejects(createPack(publisher, { pack: broken }, ORIGIN), 422);
    expect(error.errors.join("\n")).toContain("units");
    expect(await db.contentPack.findUnique({ where: { id: "broken-pack" } })).toBeNull();
  });

  it("adds and replaces units, reporting autoCheck problems and refusing to publish until they're fixed", async () => {
    await createPack(publisher, { pack: pack("density-b") }, ORIGIN);
    const added = await putUnit(publisher, { packId: "density-b", unit: unitWithProblem("floating") }, ORIGIN);
    expect(added.stats.units).toBe(2);
    expect(added.problems).toEqual([expect.stringContaining("options contain duplicates")]);

    const refused = await rejects(updatePack(publisher, { id: "density-b", status: "published" }, ORIGIN), 422);
    expect(refused.errors).toEqual(added.problems);

    const fixed = unitWithProblem("floating");
    (fixed.lessons[0].exercises[0] as Extract<Exercise, { type: "multiple_choice" }>).options = ["Sinks", "Floats", "Hovers"];
    const replaced = await putUnit(publisher, { packId: "density-b", unit: fixed, position: 0 }, ORIGIN);
    expect(replaced.stats.units).toBe(2);
    expect(replaced.problems).toEqual([]);
    const stored = (await getPack(publisher, "density-b")).pack as ContentPack;
    expect(stored.units.map((u) => u.id)).toEqual(["floating", "density"]);

    const published = await updatePack(publisher, { id: "density-b", status: "published" }, ORIGIN);
    expect(published.status).toBe("published");

    // A live pack never takes a write with problems.
    await rejects(putUnit(publisher, { packId: "density-b", unit: unitWithProblem("floating") }, ORIGIN), 422);
  });

  it("keeps a draft-only key away from publishing", async () => {
    await rejects(createPack(drafter, { pack: pack("drafty"), status: "published" }, ORIGIN), 403);
    const draft = await createPack(drafter, { pack: pack("drafty") }, ORIGIN);
    expect(draft.status).toBe("draft");
    await putUnit(drafter, { packId: "drafty", unit: unitWithProblem("more") }, ORIGIN);
    await rejects(updatePack(drafter, { id: "drafty", status: "published" }, ORIGIN), 403);
    // Packs that are already live are off limits too.
    await rejects(updatePack(drafter, { id: "density-b", status: "draft" }, ORIGIN), 403);
  });

  it("only lets agents change packs made through the agent API", async () => {
    await rejects(updatePack(publisher, { id: "admin-made", status: "archived" }, ORIGIN), 403);
    await rejects(putUnit(publisher, { packId: "admin-made", unit: unitWithProblem("x") }, ORIGIN), 403);
    await rejects(updatePack(publisher, { id: "missing", status: "archived" }, ORIGIN), 404);
    const listed = await listPacks(publisher);
    expect(listed.find((p) => p.id === "admin-made")).toMatchObject({ status: "published", editable: false });
    expect(listed.find((p) => p.id === "density-a")).toMatchObject({ editable: true });
    expect((await listPacks(drafter)).find((p) => p.id === "density-b")).toMatchObject({ editable: false });
  });

  it("replaces a whole pack, keeping its id and recording who changed it", async () => {
    const replacement = { ...pack("ignored-id"), title: "Density, revisited" };
    const result = await updatePack(drafter, { id: "density-a", pack: replacement }, ORIGIN);
    expect(result).toMatchObject({ id: "density-a", title: "Density, revisited", status: "draft" });
    const row = await db.contentPack.findUniqueOrThrow({ where: { id: "density-a" } });
    expect(JSON.parse(row.generatedBy)).toMatchObject({ keyName: "Claude", updatedBy: "Drafts only" });
  });

  it("validates without saving", () => {
    expect(validatePack(pack("x"))).toMatchObject({ valid: true, publishable: true, errors: [], problems: [] });
    expect(validatePack({ nope: true })).toMatchObject({ valid: false, publishable: false });
  });
});

describe("agent MCP tools", () => {
  it("runs the whole create → add unit → publish flow through tools/call", async () => {
    let writes = 0;
    const server = agentMcpServer(publisher, ORIGIN, () => writes++);
    const call = async (name: string, args: object) => {
      const reply = (await handleMcpPayload({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, server)) as {
        result: { content: { text: string }[]; isError: boolean };
      };
      return { text: reply.result.content[0].text, isError: reply.result.isError };
    };

    const guide = await call("get_guide", {});
    expect(guide.text).toContain("`create_pack`");

    const created = await call("create_pack", { pack: pack("mcp-course") });
    expect(created.isError).toBe(false);
    expect(JSON.parse(created.text)).toMatchObject({ id: "mcp-course", status: "draft" });

    const bad = await call("put_unit", { packId: "mcp-course", unit: { title: "no id" } });
    expect(bad).toMatchObject({ isError: true, text: expect.stringContaining("unit.id is required") });
    const invalidArgs = await call("update_pack", { id: "mcp-course" });
    expect(invalidArgs).toMatchObject({ isError: true, text: expect.stringContaining("Send a pack, a status, or both") });

    const published = await call("update_pack", { id: "mcp-course", status: "published" });
    expect(JSON.parse(published.text)).toMatchObject({ status: "published" });
    expect(writes).toBe(2);

    const list = JSON.parse((await call("list_packs", {})).text) as { packs: { id: string }[] };
    expect(list.packs.map((p) => p.id)).toContain("mcp-course");
  });
});
