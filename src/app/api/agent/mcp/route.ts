import { json, readJsonBody, revalidateAfterWrite, withAgent } from "@/server/agent/http";
import { handleMcpPayload, RPC_ERRORS, rpcError } from "@/server/agent/mcp";
import { AgentApiError } from "@/server/agent/service";
import { agentMcpServer } from "@/server/agent/tools";

/**
 * MCP endpoint (Streamable HTTP, stateless, JSON replies). The key comes from
 * `Authorization: Bearer` or `?key=` — chat apps that add connectors by URL
 * can't send headers.
 */
export async function POST(request: Request) {
  return withAgent(
    request,
    async (caller, origin) => {
      let payload: unknown;
      try {
        payload = await readJsonBody(request);
      } catch (error) {
        if (error instanceof AgentApiError && error.status === 400) {
          return json(rpcError(null, RPC_ERRORS.parse, error.message), 400);
        }
        throw error;
      }
      const reply = await handleMcpPayload(
        payload,
        agentMcpServer(caller, origin, revalidateAfterWrite),
      );
      return reply === null ? new Response(null, { status: 202 }) : json(reply);
    },
    { allowQueryKey: true },
  );
}

/** No server-initiated stream and no sessions. */
function notAllowed() {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
export const GET = notAllowed;
export const DELETE = notAllowed;
