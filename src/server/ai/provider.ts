import type { ExerciseType } from "@/content/registry";
import { AiConfigError } from "./errors";
import type { JsonSchema } from "./json-schema";
import type { GenerationParams, OutlineLesson, Usage } from "./schemas";

/**
 * Provider adapter interface. Implementations: anthropic.ts (default),
 * openai.ts (secondary), mock.ts (tests / CI).
 *
 * This module and the adapters deliberately do NOT import "server-only":
 * the CLI (`npm run generate`, plain Node via tsx) needs them, and
 * "server-only" throws outside React Server environments. App code imports
 * the pipeline through `src/server/ai/index.ts`, which does import it.
 * `assertServerRuntime()` is a second line of defence against bundling an
 * adapter into the browser. Keys are only ever read from process.env here.
 */
export interface AiRequest {
  system: string;
  prompt: string;
  /** JSON Schema the reply must match (see json-schema.ts). Always validate with Zod afterwards. */
  schema: JsonSchema;
  /** Short identifier, e.g. "lesson"; used as tool / format name. Letters, digits, _ and -. */
  schemaName: string;
  maxTokens: number;
  signal?: AbortSignal;
  /** Structured context about the call. Real providers ignore it; the mock builds replies from it. */
  meta?: GenerationMeta;
}

export interface AiResult {
  data: unknown;
  usage: Usage;
}

export interface AiProvider {
  /** "anthropic" | "openai" | "mock" */
  readonly name: string;
  readonly model: string;
  generateJSON(request: AiRequest): Promise<AiResult>;
}

export type GenerationMeta =
  | { stage: "outline"; params: GenerationParams; allowedTypes: ExerciseType[]; attempt: number }
  | {
      stage: "lesson";
      params: GenerationParams;
      allowedTypes: ExerciseType[];
      unitId: string;
      lesson: OutlineLesson;
      exerciseCount: number;
      attempt: number;
    };

export type ProviderName = "anthropic" | "openai" | "mock";

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  // Claude Opus 5.5: current default Opus for high-quality structured generation.
  anthropic: "claude-opus-5-5",
  openai: "gpt-4.1",
  mock: "mock-1",
};

/** Throws in a browser (jsdom test environments excepted). */
export function assertServerRuntime(): void {
  if (typeof window !== "undefined" && !process.env.VITEST) {
    throw new Error("The AI provider can only run on the server.");
  }
}

type Env = Record<string, string | undefined>;

/**
 * Pick a provider from the environment:
 *   AI_PROVIDER = anthropic (default) | openai | mock
 *   AI_MODEL    = model id (blank = adapter default)
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY
 * Throws AiConfigError with a fix-it message when a key is missing.
 */
export async function getProvider(env: Env = process.env): Promise<AiProvider> {
  assertServerRuntime();
  const name = (env.AI_PROVIDER?.trim() || "anthropic").toLowerCase();
  const model = env.AI_MODEL?.trim() || undefined;

  if (name === "mock") {
    const { createMockProvider } = await import("./mock");
    return createMockProvider({ model });
  }
  if (name === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new AiConfigError(
        "ANTHROPIC_API_KEY is not set. Add it to .env (server-side only), or set AI_PROVIDER=mock to generate placeholder content without a key.",
      );
    }
    const { createAnthropicProvider } = await import("./anthropic");
    return createAnthropicProvider({
      apiKey,
      model,
      baseURL: env.ANTHROPIC_BASE_URL?.trim() || undefined,
      effort: parseEffort(env.AI_EFFORT),
      fallbacks: env.AI_FALLBACKS?.trim().toLowerCase() !== "off",
      outputMode: parseOutputMode(env.AI_OUTPUT_MODE),
    });
  }
  if (name === "openai") {
    const apiKey = env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new AiConfigError("OPENAI_API_KEY is not set. Add it to .env (server-side only) or use AI_PROVIDER=anthropic.");
    }
    const { createOpenAiProvider } = await import("./openai");
    return createOpenAiProvider({ apiKey, model, baseURL: env.OPENAI_BASE_URL?.trim() || undefined });
  }
  throw new AiConfigError(`Unknown AI_PROVIDER "${env.AI_PROVIDER}". Use anthropic, openai or mock.`);
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

function parseEffort(value: string | undefined): Effort | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if ((EFFORTS as readonly string[]).includes(v)) return v as Effort;
  throw new AiConfigError(`AI_EFFORT must be one of ${EFFORTS.join(", ")} (got "${value}").`);
}

export type OutputMode = "auto" | "structured" | "tool";

function parseOutputMode(value: string | undefined): OutputMode {
  const v = value?.trim().toLowerCase();
  if (!v) return "auto";
  if (v === "auto" || v === "structured" || v === "tool") return v;
  throw new AiConfigError(`AI_OUTPUT_MODE must be auto, structured or tool (got "${value}").`);
}

/** Tool / format names must be simple identifiers. */
export function safeSchemaName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return cleaned || "result";
}
