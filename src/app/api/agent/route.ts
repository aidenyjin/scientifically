import { buildAgentGuide } from "@/server/agent/guide";
import { withAgent } from "@/server/agent/http";

/** The guide for outside AI agents (Markdown): workflow, endpoints, content format. */
export async function GET(request: Request) {
  return withAgent(request, async (_caller, origin) => {
    return new Response(buildAgentGuide({ origin, mode: "http" }), {
      headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" },
    });
  });
}
