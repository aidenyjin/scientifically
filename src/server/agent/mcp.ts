import type { JsonSchema } from "@/server/ai/json-schema";

/**
 * A minimal, stateless Model Context Protocol server (tools only) for the
 * Streamable HTTP transport: every POST carries one JSON-RPC message (or a
 * batch, for 2025-03-26 clients) and gets a plain JSON reply — no sessions,
 * no SSE stream. Pure: the route handler does auth and HTTP, tools.ts does
 * the work. Spec: modelcontextprotocol.io/specification.
 */
export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const;

export interface McpToolResult {
  text: string;
  isError?: boolean;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
  run(args: Record<string, unknown>): Promise<McpToolResult>;
}

export interface McpServer {
  name: string;
  title: string;
  version: string;
  instructions: string;
  tools: McpTool[];
}

type Id = string | number | null;
type JsonRpcReply =
  | { jsonrpc: "2.0"; id: Id; result: unknown }
  | { jsonrpc: "2.0"; id: Id; error: { code: number; message: string } };

export const RPC_ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
} as const;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const reply = (id: Id, result: unknown): JsonRpcReply => ({ jsonrpc: "2.0", id, result });
export const rpcError = (id: Id, code: number, message: string): JsonRpcReply => ({ jsonrpc: "2.0", id, error: { code, message } });

/** The client's version when we speak it, else our newest (the client then decides). */
export function negotiateVersion(requested: unknown): string {
  return typeof requested === "string" && (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
    ? requested
    : MCP_PROTOCOL_VERSIONS[0];
}

async function handleMessage(message: unknown, server: McpServer): Promise<JsonRpcReply | null> {
  if (!isRecord(message) || message.jsonrpc !== "2.0") {
    const id = isRecord(message) && (typeof message.id === "string" || typeof message.id === "number") ? message.id : null;
    return rpcError(id, RPC_ERRORS.invalidRequest, "Expected a JSON-RPC 2.0 message.");
  }
  // Responses to server requests (we send none) and notifications need no reply.
  if (typeof message.method !== "string" || !("id" in message)) return null;
  const id = typeof message.id === "string" || typeof message.id === "number" ? message.id : null;
  const params = isRecord(message.params) ? message.params : {};

  switch (message.method) {
    case "initialize":
      return reply(id, {
        protocolVersion: negotiateVersion(params.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: server.name, title: server.title, version: server.version },
        instructions: server.instructions,
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, {
        tools: server.tools.map(({ name, title, description, inputSchema, annotations }) => ({
          name,
          title,
          description,
          inputSchema,
          ...(annotations ? { annotations } : {}),
        })),
      });
    case "tools/call": {
      const tool = server.tools.find((t) => t.name === params.name);
      if (!tool) return rpcError(id, RPC_ERRORS.invalidParams, `Unknown tool: ${String(params.name)}`);
      try {
        const result = await tool.run(isRecord(params.arguments) ? params.arguments : {});
        return reply(id, { content: [{ type: "text", text: result.text }], isError: result.isError === true });
      } catch (error) {
        const text = error instanceof Error ? error.message : "The tool failed.";
        return reply(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return rpcError(id, RPC_ERRORS.methodNotFound, `Method not found: ${message.method}`);
  }
}

/**
 * Handle one POST body. Returns the JSON to send back, or null when nothing
 * needs a reply (notifications and responses), which the transport answers
 * with 202 Accepted.
 */
export async function handleMcpPayload(payload: unknown, server: McpServer): Promise<JsonRpcReply | JsonRpcReply[] | null> {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return rpcError(null, RPC_ERRORS.invalidRequest, "Empty batch.");
    const replies = (await Promise.all(payload.map((m) => handleMessage(m, server)))).filter((r) => r !== null);
    return replies.length ? replies : null;
  }
  return handleMessage(payload, server);
}
