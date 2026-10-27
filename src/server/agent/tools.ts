import "server-only";
import type { z } from "zod";
import { formatIssues } from "@/content/schema/course";
import { jsonSchemaFor } from "@/server/ai/json-schema";
import type { AgentCaller } from "./api-keys";
import { buildAgentGuide } from "./guide";
import type { McpServer, McpTool, McpToolResult } from "./mcp";
import {
  createInput,
  getPackInput,
  noInput,
  operation,
  putUnitInput,
  updateInput,
  validateInput,
  type Operation,
} from "./operations";
import { AgentApiError, createPack, getPack, listPacks, putUnit, updatePack, validatePack } from "./service";

/** The agent API as MCP tools, bound to one caller. `onWrite` runs after every successful save. */
export function agentMcpServer(caller: AgentCaller, origin: string, onWrite: () => void): McpServer {
  const json = (value: unknown): McpToolResult => ({ text: JSON.stringify(value, null, 2) });
  const READ = { readOnlyHint: true, openWorldHint: false };
  const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const REPLACE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

  function tool<S extends z.ZodType>(
    name: Operation["tool"],
    title: string,
    schema: S,
    annotations: McpTool["annotations"],
    run: (args: z.infer<S>) => Promise<McpToolResult>,
  ): McpTool {
    return {
      name,
      title,
      description: operation(name).summary,
      inputSchema: jsonSchemaFor(schema),
      annotations,
      async run(args) {
        const parsed = schema.safeParse(args);
        if (!parsed.success) return { text: ["Invalid arguments:", ...formatIssues(parsed.error)].join("\n"), isError: true };
        try {
          return await run(parsed.data);
        } catch (error) {
          if (!(error instanceof AgentApiError)) throw error;
          return { text: [error.message, ...error.errors].join("\n"), isError: true };
        }
      },
    };
  }
  const write = async (result: Promise<unknown>) => {
    const value = await result;
    onWrite();
    return json(value);
  };

  return {
    name: "scientifically",
    title: "Scientifically",
    version: "1.0.0",
    instructions:
      "Scientifically is a Duolingo-style science learning app. Use these tools to write courses into it. " +
      "Call get_guide first: it explains the course format, the rules and every question type with examples. " +
      "Then create_pack with the first unit (saved as a draft), put_unit for each further unit, fix every reported " +
      'problem, and finally update_pack with status "published".',
    tools: [
      tool("get_guide", "Read the course-writing guide", noInput, READ, async () => ({
        text: buildAgentGuide({ origin, mode: "mcp" }),
      })),
      tool("list_packs", "List courses", noInput, READ, async () => json({ packs: await listPacks(caller) })),
      tool("get_pack", "Get a course", getPackInput, READ, async ({ id }) => json(await getPack(caller, id))),
      tool("validate_pack", "Check a course without saving", validateInput, READ, async ({ pack }) => json(validatePack(pack))),
      tool("create_pack", "Create a course", createInput, WRITE, (input) => write(createPack(caller, input, origin))),
      tool("put_unit", "Add or replace a unit", putUnitInput, REPLACE, (input) => write(putUnit(caller, input, origin))),
      tool("update_pack", "Update or publish a course", updateInput, REPLACE, (input) => write(updatePack(caller, input, origin))),
    ],
  };
}
