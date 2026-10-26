import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageStreamParams,
  BetaTool,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { AiAbortError, AiConfigError, AiOutputError, AiProviderError } from "./errors";
import { parseJsonFromText, toStrictSchema, type JsonSchema } from "./json-schema";
import {
  DEFAULT_MODELS,
  assertServerRuntime,
  safeSchemaName,
  type AiProvider,
  type AiRequest,
  type AiResult,
  type Effort,
  type OutputMode,
} from "./provider";
import { now } from "@/lib/clock";
import { parseRetryAfter, withRetry } from "./retry";

/**
 * Claude adapter (default provider), using the official SDK.
 *
 * - Small schemas that grammar-constrained decoding can represent (the course
 *   outline) use structured outputs (`output_config.format`).
 * - Big schemas (a lesson: a 16-way union with records and many optional
 *   fields, beyond the strict-mode limits) go through a single non-strict
 *   tool whose `input_schema` is the full JSON Schema; the model is told to
 *   call it once (forced `tool_choice` is rejected on Opus 5.5, so it is `auto`).
 *   `eager_input_streaming` is left off on purpose: we never consume partial
 *   input, and server-side buffering guarantees the input is well-formed JSON
 *   instead of a tolerantly-parsed, possibly truncated object.
 * Either way the caller validates the result with Zod.
 *
 * Requests stream (`finalMessage()`) so long generations never hit HTTP
 * timeouts, use adaptive thinking with `effort` (default "high"), cache the
 * large stable system prompt, and opt into server-side refusal fallbacks
 * (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`; disable with
 * AI_FALLBACKS=off). 429 / 5xx / overloaded / network errors are retried with
 * exponential backoff (honouring retry-after); `signal` aborts at any point.
 */
export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /** Default "high": content quality matters more than speed here. */
  effort?: Effort;
  /** Server-side refusal fallbacks. Default true. */
  fallbacks?: boolean;
  /** "auto" (default) picks structured outputs when the schema fits, else a tool. */
  outputMode?: OutputMode;
  /** Adaptive thinking. Default true; set false only for models without it. */
  thinking?: boolean;
  /** Retries for 429 / 5xx / network errors. Default 4. */
  maxRetries?: number;
  /** First backoff delay; doubles each retry (with jitter), capped at 60 s. Default 2000 ms. */
  retryBaseDelayMs?: number;
  /** Per-request timeout. Default 20 minutes. */
  timeoutMs?: number;
  onRetry?(info: { attempt: number; delayMs: number; error: unknown }): void;
  /** Inject a pre-built client (tests). */
  client?: Pick<Anthropic, "beta">;
}

type Mode = "structured" | "tool";

export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function createAnthropicProvider(options: AnthropicProviderOptions): AiProvider {
  assertServerRuntime();
  if (!options.apiKey && !options.client) throw new AiConfigError("ANTHROPIC_API_KEY is not set.");
  const model = options.model || DEFAULT_MODELS.anthropic;
  const client =
    options.client ??
    new Anthropic({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      maxRetries: 0, // we retry ourselves (below) so we can log and honour the abort signal
      timeout: options.timeoutMs ?? 20 * 60_000,
    });

  const call = async (request: AiRequest, mode: Mode): Promise<AiResult> => {
    const params = buildAnthropicParams(request, { ...options, model }, mode);
    return withRetry(
      async () => {
        try {
          const stream = client.beta.messages.stream(params, { signal: request.signal });
          const message = await stream.finalMessage();
          return readAnthropicMessage(message, mode, params.tools?.[0] ? safeSchemaName(request.schemaName) : null);
        } catch (error) {
          throw mapAnthropicError(error, model);
        }
      },
      {
        retries: options.maxRetries ?? 4,
        baseDelayMs: options.retryBaseDelayMs,
        signal: request.signal,
        isRetryable: (e) => e instanceof AiProviderError && e.retryable,
        retryAfterMs: (e) => (e instanceof AiProviderError ? e.retryAfterMs : undefined),
        onRetry: options.onRetry,
      },
    );
  };

  return {
    name: "anthropic",
    model,
    async generateJSON(request) {
      const mode = chooseMode(request.schema, options.outputMode ?? "auto");
      try {
        return await call(request, mode);
      } catch (error) {
        // A schema the grammar compiler rejects ("Schema is too complex for
        // compilation", unsupported keyword) → retry once as a tool call.
        if (
          mode === "structured" &&
          (options.outputMode ?? "auto") === "auto" &&
          error instanceof AiProviderError &&
          error.status === 400 &&
          /schema|output_config|format|grammar|compil/i.test(error.message)
        ) {
          return call(request, "tool");
        }
        throw error;
      }
    },
  };
}

export function chooseMode(schema: JsonSchema, outputMode: OutputMode): Mode {
  if (outputMode === "tool") return "tool";
  if (outputMode === "structured") return "structured";
  return toStrictSchema(schema).compatible ? "structured" : "tool";
}

/** Pure request builder (unit tested). */
export function buildAnthropicParams(
  request: AiRequest,
  options: Omit<AnthropicProviderOptions, "apiKey" | "client"> & { model: string },
  mode: Mode,
): BetaMessageStreamParams {
  const name = safeSchemaName(request.schemaName);
  const fallbacks = options.fallbacks ?? true;
  const base: BetaMessageStreamParams = {
    model: options.model,
    max_tokens: request.maxTokens,
    // The system prompt (contract, type schemas, examples, cast) is large and
    // identical across a job's lesson calls: cache it.
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: request.prompt }],
    ...(options.thinking === false ? {} : { thinking: { type: "adaptive" as const } }),
    output_config: { effort: options.effort ?? "high" },
    ...(fallbacks ? { betas: [FALLBACK_BETA], fallbacks: "default" as const } : {}),
  };

  if (mode === "structured") {
    const strict = toStrictSchema(request.schema);
    return {
      ...base,
      output_config: { ...base.output_config, format: { type: "json_schema", schema: strict.schema } },
    };
  }

  const inputSchema = { ...request.schema };
  delete inputSchema.$schema;
  if (inputSchema.type !== "object") {
    throw new AiConfigError(`Tool output needs an object schema; "${name}" has type ${String(inputSchema.type)}.`);
  }
  const tool: BetaTool = {
    name,
    description: `Submit the complete ${name.replace(/_/g, " ")} as JSON matching this schema. Call it exactly once.`,
    input_schema: { ...inputSchema, type: "object" },
  };
  return {
    ...base,
    tools: [tool],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: request.prompt },
          {
            type: "text",
            text: `Submit your answer by calling the \`${name}\` tool exactly once with the complete JSON. Do not write the JSON in your reply text.`,
          },
        ],
      },
    ],
  };
}

/** Pure response reader (unit tested). `toolName` is null in structured mode. */
export function readAnthropicMessage(message: BetaMessage, mode: Mode, toolName: string | null): AiResult {
  const usage = {
    inputTokens:
      message.usage.input_tokens +
      (message.usage.cache_creation_input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0),
    outputTokens: message.usage.output_tokens,
  };
  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  if (message.stop_reason === "refusal") {
    const category = message.stop_details?.category ?? "unspecified";
    throw new AiOutputError("refusal", `The model declined to answer (refusal category: ${category}).`, text);
  }
  if (message.stop_reason === "max_tokens") {
    throw new AiOutputError(
      "truncated",
      `The reply hit max_tokens (${message.usage.output_tokens} output tokens) before it was complete.`,
      text,
    );
  }

  if (mode === "tool" && toolName) {
    const block = message.content.find((b) => b.type === "tool_use" && b.name === toolName);
    if (block && block.type === "tool_use") return { data: block.input, usage };
  }
  // Structured mode, or the model wrote the JSON as text instead of calling the tool.
  return { data: parseJsonFromText(text), usage };
}

const RETRYABLE_STREAM_TYPES = new Set(["overloaded_error", "api_error", "rate_limit_error", "timeout_error"]);

/** Map SDK errors onto the pipeline's error types (typed checks, most specific first). */
export function mapAnthropicError(error: unknown, model: string): unknown {
  if (error instanceof AiOutputError) return error;
  if (error instanceof Anthropic.APIUserAbortError) return new AiAbortError();
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiProviderError(`Could not reach the Anthropic API: ${error.message}`, { retryable: true, cause: error });
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return new AiConfigError("The Anthropic API rejected ANTHROPIC_API_KEY (401). Check the key in .env.");
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new AiConfigError(`The Anthropic API refused access (403): ${error.message}`);
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new AiConfigError(`Model "${model}" was not found or is not available to this key (404). Check AI_MODEL.`);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AiProviderError(`Rate limited by the Anthropic API (429): ${error.message}`, {
      retryable: true,
      status: 429,
      retryAfterMs: parseRetryAfter(error.headers?.get("retry-after"), now().getTime()),
      cause: error,
    });
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new AiProviderError(`Anthropic API rejected the request (400): ${error.message}`, {
      retryable: false,
      status: 400,
      cause: error,
    });
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const retryable =
      (typeof status === "number" && (status >= 500 || status === 408 || status === 409)) ||
      (status === undefined && error.type !== null && RETRYABLE_STREAM_TYPES.has(error.type));
    return new AiProviderError(`Anthropic API error${status ? ` (${status})` : ""}: ${error.message}`, {
      retryable,
      status,
      retryAfterMs: parseRetryAfter(error.headers?.get("retry-after"), now().getTime()),
      cause: error,
    });
  }
  return error;
}
