import { z } from "zod";

/**
 * What ContentPack.generatedBy holds for packs written through the agent API.
 * Agents may only change packs carrying this record.
 */
export const agentProvenanceSchema = z.object({
  source: z.literal("agent"),
  keyId: z.string(),
  keyName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  /** Name of the key that made the latest change, when it differs from the creator. */
  updatedBy: z.string().optional(),
});

export type AgentProvenance = z.infer<typeof agentProvenanceSchema>;

/** Parse ContentPack.generatedBy; null unless the pack came from the agent API. */
export function parseAgentProvenance(json: string | null | undefined): AgentProvenance | null {
  if (!json) return null;
  try {
    const parsed = agentProvenanceSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
