import "server-only";
import { contentPackSchema } from "@/content/schema/course";
import { now } from "@/lib/clock";
import { checkPack } from "@/server/ai/validate";
import { db } from "@/server/db";
import { savePack, type PackStatus } from "@/server/repo/packs";
import type { AgentCaller } from "./api-keys";
import { parseAgentProvenance, type AgentProvenance } from "./provenance";

/**
 * What the agent API does, shared by the HTTP routes and the MCP tools.
 *
 * Rules:
 * - Packs are checked like admin imports: schema errors reject the write
 *   (nothing is saved); autoCheck problems are reported and keep the pack
 *   from being published. A published pack never takes a write with problems.
 * - Agents may only change packs created through this API (`source: "agent"`).
 * - A key without `canPublish` works on drafts only.
 */
export class AgentApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422,
    message: string,
    readonly errors: string[] = [],
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

export interface PackSummary {
  id: string;
  title: string;
  subject: string;
  level: string;
  status: string;
  /** True when this key may change the pack. */
  editable: boolean;
  updatedAt: string;
}

export interface WriteResult {
  id: string;
  title: string;
  status: PackStatus;
  /** Automatic-check problems still to fix (publishing is refused until this is empty). */
  problems: string[];
  stats: { units: number; lessons: number; exercises: number };
  adminUrl: string;
  message: string;
}

export interface ValidateResult {
  /** The pack matches the schema (it could be saved as a draft). */
  valid: boolean;
  /** Valid and without problems (it could be published). */
  publishable: boolean;
  errors: string[];
  problems: string[];
  stats: { units: number; lessons: number; exercises: number } | null;
}

const MAX_LISTED_ERRORS = 60;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function editable(caller: AgentCaller, row: { status: string; generatedBy: string }): boolean {
  return parseAgentProvenance(row.generatedBy) !== null && (caller.canPublish || row.status === "draft");
}

export async function listPacks(caller: AgentCaller): Promise<PackSummary[]> {
  const rows = await db.contentPack.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, subject: true, level: true, status: true, generatedBy: true, updatedAt: true },
  });
  return rows.map(({ generatedBy, updatedAt, ...row }) => ({
    ...row,
    editable: editable(caller, { status: row.status, generatedBy }),
    updatedAt: updatedAt.toISOString(),
  }));
}

export async function getPack(caller: AgentCaller, id: string) {
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) throw new AgentApiError(404, `No pack with id "${id}".`);
  return { id: row.id, status: row.status, editable: editable(caller, row), pack: JSON.parse(row.json) as unknown };
}

export function validatePack(input: unknown): ValidateResult {
  const check = checkPack(input);
  if (!check.pack) {
    return { valid: false, publishable: false, errors: check.errors.slice(0, MAX_LISTED_ERRORS), problems: [], stats: null };
  }
  return { valid: true, publishable: check.ok, errors: [], problems: check.errors, stats: check.stats };
}

function assertMayUse(caller: AgentCaller, from: PackStatus | null, to: PackStatus) {
  if (caller.canPublish || ((from === null || from === "draft") && to === "draft")) return;
  throw new AgentApiError(
    403,
    from !== null && from !== "draft"
      ? `This key can only change drafts, and this pack is ${from}. Ask an admin for a key that may publish.`
      : "This key can only save drafts. Leave out \"status\" (or send \"draft\"); an admin will review and publish it.",
  );
}

async function freeId(base: string): Promise<string> {
  let id = base;
  for (let n = 2; await db.contentPack.findUnique({ where: { id }, select: { id: true } }); n++) id = `${base}-${n}`;
  return id;
}

function describe(status: PackStatus, problems: number): string {
  if (status === "published") return "Published: learners can pick this course in the course switcher.";
  const where = status === "archived" ? "Archived (hidden from learners)." : "Saved as a draft (not visible to learners yet).";
  return problems > 0 ? `${where} ${problems} problem(s) to fix before it can be published.` : `${where} No problems found.`;
}

/** Check, enforce the status rules, save. `current` is null for a new pack. */
async function commit(
  caller: AgentCaller,
  candidate: unknown,
  current: { status: PackStatus; provenance: AgentProvenance } | null,
  requested: PackStatus | undefined,
  origin: string,
): Promise<WriteResult> {
  const check = checkPack(candidate);
  if (!check.pack || !check.stats) {
    throw new AgentApiError(422, "The pack doesn't match the schema; nothing was saved.", check.errors.slice(0, MAX_LISTED_ERRORS));
  }
  const status = requested ?? current?.status ?? "draft";
  assertMayUse(caller, current?.status ?? null, status);
  if (status === "published" && check.errors.length > 0) {
    throw new AgentApiError(
      422,
      current?.status === "published"
        ? "This course is live, so changes must pass every automatic check; nothing was saved."
        : "Fix these problems before publishing; nothing was saved.",
      check.errors.slice(0, MAX_LISTED_ERRORS),
    );
  }

  const at = now().toISOString();
  const provenance: AgentProvenance = current
    ? {
        ...current.provenance,
        updatedAt: at,
        ...(current.provenance.keyId !== caller.keyId ? { updatedBy: caller.keyName } : {}),
      }
    : { source: "agent", keyId: caller.keyId, keyName: caller.keyName, createdAt: at };
  await savePack(check.pack, status, provenance);
  return {
    id: check.pack.id,
    title: check.pack.title,
    status,
    problems: check.errors,
    stats: check.stats,
    adminUrl: `${origin}/admin/packs/${check.pack.id}`,
    message: describe(status, check.errors.length),
  };
}

/** A pack this caller may change, with its current content. */
async function loadOwn(caller: AgentCaller, id: string) {
  const row = await db.contentPack.findUnique({ where: { id } });
  if (!row) throw new AgentApiError(404, `No pack with id "${id}".`);
  const provenance = parseAgentProvenance(row.generatedBy);
  if (!provenance) {
    throw new AgentApiError(403, `Pack "${id}" wasn't made through the agent API, so only an admin can change it.`);
  }
  const status = row.status as PackStatus;
  return { status, provenance, json: row.json };
}

export async function createPack(
  caller: AgentCaller,
  input: { pack: unknown; status?: "draft" | "published" },
  origin: string,
): Promise<WriteResult> {
  // Pick a free id first so the check reports problems against the id that will be saved.
  const parsed = contentPackSchema.safeParse(input.pack);
  const pack = parsed.success ? { ...parsed.data, id: await freeId(parsed.data.id) } : input.pack;
  return commit(caller, pack, null, input.status, origin);
}

export async function putUnit(
  caller: AgentCaller,
  input: { packId: string; unit: unknown; position?: number },
  origin: string,
): Promise<WriteResult> {
  const { unit } = input;
  if (!isRecord(unit) || typeof unit.id !== "string" || unit.id === "") {
    throw new AgentApiError(400, "unit.id is required (a slug, unique in the pack).");
  }
  const own = await loadOwn(caller, input.packId);
  const stored = contentPackSchema.safeParse(JSON.parse(own.json));
  if (!stored.success) {
    throw new AgentApiError(409, "The stored pack is invalid; replace the whole pack with update_pack instead.");
  }
  const units: unknown[] = [...stored.data.units];
  const index = stored.data.units.findIndex((u) => u.id === unit.id);
  if (index !== -1) units.splice(index, 1);
  const at = Math.min(input.position ?? (index !== -1 ? index : units.length), units.length);
  units.splice(at, 0, unit);
  return commit(caller, { ...stored.data, units }, own, undefined, origin);
}

export async function updatePack(
  caller: AgentCaller,
  input: { id: string; pack?: unknown; status?: PackStatus },
  origin: string,
): Promise<WriteResult> {
  const own = await loadOwn(caller, input.id);
  let candidate: unknown;
  if (input.pack !== undefined) {
    if (!isRecord(input.pack)) throw new AgentApiError(400, "pack must be a JSON object.");
    candidate = { ...input.pack, id: input.id };
  } else {
    candidate = JSON.parse(own.json);
  }
  return commit(caller, candidate, own, input.status, origin);
}
