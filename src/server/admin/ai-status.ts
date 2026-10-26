import "server-only";
import { DEFAULT_MODELS, getProvider } from "@/server/ai";

/** What the generate page shows about the configured provider. Never includes a key. */
export interface AiStatus {
  provider: string;
  model: string;
  ready: boolean;
  /** Fix-it message when not ready (e.g. "ANTHROPIC_API_KEY is not set…"). */
  message: string | null;
  isMock: boolean;
}

export async function getAiStatus(): Promise<AiStatus> {
  const name = (process.env.AI_PROVIDER?.trim() || "anthropic").toLowerCase();
  const fallbackModel =
    process.env.AI_MODEL?.trim() || (DEFAULT_MODELS as Record<string, string | undefined>)[name] || "unknown";
  try {
    // Builds the adapter exactly as a job would (no network call), so this
    // reports the same provider/model and the same missing-key error.
    const provider = await getProvider();
    return { provider: provider.name, model: provider.model, ready: true, message: null, isMock: provider.name === "mock" };
  } catch (error) {
    return {
      provider: name,
      model: fallbackModel,
      ready: false,
      message: error instanceof Error ? error.message : "The AI provider is not configured.",
      isMock: name === "mock",
    };
  }
}
