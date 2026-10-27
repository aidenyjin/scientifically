import "server-only";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { formatIssues } from "@/content/schema/course";
import { authenticateApiKey, type AgentCaller } from "./api-keys";
import { readApiKey } from "./keys";
import { publicOrigin } from "./origin";
import { AgentApiError } from "./service";

/** Helpers shared by the /api/agent route handlers. */
export const MAX_BODY_BYTES = 5_000_000;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AgentApiError) {
    return json({ error: error.message, ...(error.errors.length ? { errors: error.errors } : {}) }, error.status);
  }
  console.error("[agent] request failed:", error);
  return json({ error: "Something went wrong on the server." }, 500);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw new AgentApiError(413, "The body is larger than 5 MB.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new AgentApiError(413, "The body is larger than 5 MB.");
  if (!text.trim()) throw new AgentApiError(400, "Send a JSON body.");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AgentApiError(400, `The body isn't valid JSON: ${(error as Error).message}`);
  }
}

export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AgentApiError(400, "The request body has the wrong shape.", formatIssues(parsed.error));
  return parsed.data;
}

/** Learner and admin pages should show agent writes straight away. */
export function revalidateAfterWrite(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
}

/**
 * Authenticate the request's key, then run `handler`; errors become JSON
 * replies. `allowQueryKey` also accepts `?key=` (the MCP endpoint only).
 */
export async function withAgent(
  request: Request,
  handler: (caller: AgentCaller, origin: string) => Promise<Response>,
  opts: { allowQueryKey?: boolean } = {},
): Promise<Response> {
  const origin = publicOrigin(request.headers);
  try {
    const key = readApiKey(request.headers, new URL(request.url), { allowQuery: opts.allowQueryKey });
    const caller = await authenticateApiKey(key);
    if (!caller) {
      return json(
        {
          error: key
            ? "This API key is unknown or has been revoked."
            : 'Missing API key. Send it as the header "Authorization: Bearer <key>".',
          help: `An admin creates keys at ${origin}/admin/agents.`,
        },
        401,
        { "www-authenticate": 'Bearer realm="scientifically"' },
      );
    }
    return await handler(caller, origin);
  } catch (error) {
    return errorResponse(error);
  }
}
