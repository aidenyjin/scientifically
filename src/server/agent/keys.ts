import { createHash, randomBytes } from "node:crypto";

/**
 * Pure helpers for agent API keys (no DB, so they are unit tested).
 * A key is `sci_` + 32 base64url characters (192 random bits). Only its
 * sha256 is stored; a fast hash is enough because the key is random, not a
 * password a person chose.
 */
export const API_KEY_PREFIX = "sci_";
const KEY_PATTERN = /^sci_[A-Za-z0-9_-]{32}$/;

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(24).toString("base64url");
}

export function looksLikeApiKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** What the admin list shows, e.g. "sci_AbC1…". */
export function keyPreview(key: string): string {
  return key.slice(0, API_KEY_PREFIX.length + 4);
}

/**
 * The key from a request: `Authorization: Bearer <key>` or `X-Api-Key: <key>`.
 * `?key=` is only read when `allowQuery` is set (the MCP endpoint), because
 * chat apps that add connectors by URL can't send headers.
 */
export function readApiKey(headers: Headers, url: URL, opts: { allowQuery?: boolean } = {}): string | null {
  const auth = headers.get("authorization")?.trim();
  const bearer = auth?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const candidate = bearer ?? headers.get("x-api-key")?.trim() ?? (opts.allowQuery ? url.searchParams.get("key") : null);
  return candidate ? candidate.trim() : null;
}
