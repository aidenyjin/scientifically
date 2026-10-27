import { z } from "zod";

/**
 * The agent API's operations, shared by the HTTP routes (src/app/api/agent),
 * the MCP tools (tools.ts) and the guide, so names and inputs stay in sync.
 */
const packInput = z
  .record(z.string(), z.unknown())
  .describe("A complete pack: { schemaVersion, id, title, subject, level, description, units } (see the guide)");
const unitInput = z
  .record(z.string(), z.unknown())
  .describe("A complete unit: { id, title, description, color?, lessons } (see the guide)");

export const noInput = z.object({});
export const getPackInput = z.object({ id: z.string().min(1).describe("Pack id") });
export const validateInput = z.object({ pack: packInput });
export const createInput = z.object({
  pack: packInput,
  status: z
    .enum(["draft", "published"])
    .optional()
    .describe('Default "draft". Publish once the whole course is in and has no problems.'),
});
export const putUnitInput = z.object({
  packId: z.string().min(1).describe("Pack id (as returned by create_pack)"),
  unit: unitInput,
  position: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("0-based place for the unit; default: keep its place, or add it at the end"),
});
export const updateInput = z
  .object({
    id: z.string().min(1).describe("Pack id"),
    pack: packInput.optional().describe("Replaces the whole pack (its id stays the same)"),
    status: z.enum(["draft", "published", "archived"]).optional(),
  })
  .refine((v) => v.pack !== undefined || v.status !== undefined, { message: "Send a pack, a status, or both." });

export interface Operation {
  tool: "get_guide" | "list_packs" | "get_pack" | "validate_pack" | "create_pack" | "put_unit" | "update_pack";
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  body?: string;
  summary: string;
}

export const OPERATIONS: Operation[] = [
  { tool: "get_guide", method: "GET", path: "/api/agent", summary: "This guide: the course format, rules and question types." },
  { tool: "list_packs", method: "GET", path: "/api/agent/packs", summary: "Every course in the app: id, title, status and whether you may change it." },
  { tool: "get_pack", method: "GET", path: "/api/agent/packs/{id}", summary: "One course's full JSON." },
  {
    tool: "validate_pack",
    method: "POST",
    path: "/api/agent/validate",
    body: '{"pack": {…}}',
    summary: "Check a pack without saving it.",
  },
  {
    tool: "create_pack",
    method: "POST",
    path: "/api/agent/packs",
    body: '{"pack": {…}, "status"?: "draft" | "published"}',
    summary: "Save a new course (a draft unless you ask to publish). Replies with its final id.",
  },
  {
    tool: "put_unit",
    method: "PUT",
    path: "/api/agent/packs/{id}/units/{unitId}",
    body: '{"unit": {…}, "position"?: number}',
    summary: "Add a unit to a course, or replace the unit with the same id.",
  },
  {
    tool: "update_pack",
    method: "PATCH",
    path: "/api/agent/packs/{id}",
    body: '{"pack"?: {…}, "status"?: "draft" | "published" | "archived"}',
    summary: "Replace a whole course and/or change its status (publish, unpublish, archive).",
  },
];

export function operation(tool: Operation["tool"]): Operation {
  return OPERATIONS.find((o) => o.tool === tool)!;
}
