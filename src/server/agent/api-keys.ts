import "server-only";
import { now } from "@/lib/clock";
import { db } from "@/server/db";
import { generateApiKey, hashApiKey, keyPreview, looksLikeApiKey } from "./keys";

/** Who is calling the agent API (resolved from their key). */
export interface AgentCaller {
  keyId: string;
  keyName: string;
  canPublish: boolean;
}

/** Create a key. The plain key is returned once and never stored. */
export async function createApiKey(input: { name: string; canPublish: boolean }): Promise<{ id: string; key: string }> {
  const key = generateApiKey();
  const row = await db.apiKey.create({
    data: { name: input.name, canPublish: input.canPublish, prefix: keyPreview(key), hash: hashApiKey(key) },
  });
  return { id: row.id, key };
}

export async function listApiKeys() {
  return db.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, canPublish: true, createdAt: true, lastUsedAt: true, revokedAt: true },
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await db.apiKey.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now() } });
}

const TOUCH_EVERY_MS = 60_000;

/** The caller for a key, or null when it is missing, malformed, unknown or revoked. */
export async function authenticateApiKey(key: string | null): Promise<AgentCaller | null> {
  if (!key || !looksLikeApiKey(key)) return null;
  const row = await db.apiKey.findUnique({ where: { hash: hashApiKey(key) } });
  if (!row || row.revokedAt) return null;
  const at = now();
  if (!row.lastUsedAt || at.getTime() - row.lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await db.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: at } });
  }
  return { keyId: row.id, keyName: row.name, canPublish: row.canPublish };
}
