import { AiAbortError, AiConfigError, AiOutputError, AiProviderError } from "./errors";
import { parseJsonFromText } from "./json-schema";
import { DEFAULT_MODELS, assertServerRuntime, safeSchemaName, type AiProvider } from "./provider";
import { now } from "@/lib/clock";
import { parseRetryAfter, withRetry } from "./retry";

/**
 * SECONDARY provider — minimal OpenAI adapter over `fetch` (Chat Completions
 * with `response_format: json_schema`, non-strict so our full schema is
 * accepted; Zod validates afterwards). No SDK dependency. Anthropic is the
 * default and the only adapter exercised end-to-end by the owner.
 */
export interface OpenAiProviderOptions {
  apiKey: string;
  model?: string;
  baseURL?: string;
  maxRetries?: number;
  fetch?: typeof fetch;
}

interface ChatCompletion {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export function createOpenAiProvider(options: OpenAiProviderOptions): AiProvider {
  assertServerRuntime();
  if (!options.apiKey) throw new AiConfigError("OPENAI_API_KEY is not set.");
  const model = options.model || DEFAULT_MODELS.openai;
  const baseURL = (options.baseURL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;

  return {
    name: "openai",
    model,
    async generateJSON(request) {
      const body = {
        model,
        max_completion_tokens: request.maxTokens,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: safeSchemaName(request.schemaName), schema: request.schema, strict: false },
        },
      };
      return withRetry(
        async () => {
          let res: Response;
          try {
            res = await doFetch(`${baseURL}/chat/completions`, {
              method: "POST",
              headers: { "content-type": "application/json", authorization: `Bearer ${options.apiKey}` },
              body: JSON.stringify(body),
              signal: request.signal,
            });
          } catch (error) {
            if (request.signal?.aborted) throw new AiAbortError();
            throw new AiProviderError(`Could not reach the OpenAI API: ${String(error)}`, { retryable: true, cause: error });
          }
          const json = (await res.json().catch(() => ({}))) as ChatCompletion;
          if (!res.ok) {
            const message = json.error?.message ?? res.statusText;
            if (res.status === 401) throw new AiConfigError("The OpenAI API rejected OPENAI_API_KEY (401).");
            if (res.status === 404) throw new AiConfigError(`OpenAI model "${model}" not found (404). Check AI_MODEL.`);
            throw new AiProviderError(`OpenAI API error (${res.status}): ${message}`, {
              retryable: res.status === 429 || res.status >= 500,
              status: res.status,
              retryAfterMs: parseRetryAfter(res.headers.get("retry-after"), now().getTime()),
            });
          }
          const choice = json.choices?.[0];
          const usage = {
            inputTokens: json.usage?.prompt_tokens ?? 0,
            outputTokens: json.usage?.completion_tokens ?? 0,
          };
          if (choice?.message?.refusal) throw new AiOutputError("refusal", `The model declined: ${choice.message.refusal}`);
          if (choice?.finish_reason === "length") {
            throw new AiOutputError("truncated", "The reply hit max tokens before it was complete.");
          }
          return { data: parseJsonFromText(choice?.message?.content ?? ""), usage };
        },
        {
          retries: options.maxRetries ?? 4,
          signal: request.signal,
          isRetryable: (e) => e instanceof AiProviderError && e.retryable,
          retryAfterMs: (e) => (e instanceof AiProviderError ? e.retryAfterMs : undefined),
        },
      );
    },
  };
}
