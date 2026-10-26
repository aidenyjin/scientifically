import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, BetaMessageStreamParams } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_BETA,
  buildAnthropicParams,
  createAnthropicProvider,
  mapAnthropicError,
  readAnthropicMessage,
} from "./anthropic";
import { AiAbortError, AiConfigError, AiOutputError, AiProviderError } from "./errors";
import { getLessonJsonSchema, getOutlineJsonSchema } from "./generate";
import type { AiRequest } from "./provider";

const outlineRequest: AiRequest = {
  system: "SYSTEM",
  prompt: "PROMPT",
  schema: getOutlineJsonSchema(["info_card", "multiple_choice"]),
  schemaName: "course_outline",
  maxTokens: 16000,
};
const lessonRequest: AiRequest = { ...outlineRequest, schema: getLessonJsonSchema(), schemaName: "lesson" };
const opts = { model: "claude-opus-5-5" };
const body = (message: string) => ({ type: "error", error: { type: "invalid_request_error", message } });

function message(partial: Omit<Partial<BetaMessage>, "content"> & { content: unknown[] }): BetaMessage {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    stop_details: null,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 1000 },
    ...partial,
  } as unknown as BetaMessage;
}

/** A fake SDK client whose stream() replays a script of results/errors. */
function fakeClient(script: (BetaMessage | Error)[]) {
  const seen: BetaMessageStreamParams[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: BetaMessageStreamParams) {
          seen.push(params);
          const next = script.shift();
          return {
            finalMessage: async () => {
              if (!next) throw new Error("script exhausted");
              if (next instanceof Error) throw next;
              return next;
            },
          };
        },
      },
    },
  } as unknown as Pick<Anthropic, "beta">;
  return { client, seen };
}

describe("buildAnthropicParams", () => {
  it("uses structured outputs for a schema strict mode can represent", () => {
    const p = buildAnthropicParams(outlineRequest, opts, "structured");
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.max_tokens).toBe(16000);
    expect(p.output_config?.format?.type).toBe("json_schema");
    expect(p.output_config?.effort).toBe("high");
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect(p.tools).toBeUndefined();
    expect(p.system).toEqual([{ type: "text", text: "SYSTEM", cache_control: { type: "ephemeral" } }]);
    expect(p.betas).toEqual([FALLBACK_BETA]);
    expect(p.fallbacks).toBe("default");
    expect(JSON.stringify(p.output_config?.format?.schema)).not.toMatch(/"(maxLength|minLength|maxItems)":/);
    expect("temperature" in p).toBe(false);
  });

  it("uses one non-forced tool with the full schema for big schemas", () => {
    const p = buildAnthropicParams(lessonRequest, { ...opts, fallbacks: false, effort: "max" }, "tool");
    expect(p.tools).toHaveLength(1);
    const tool = p.tools![0] as { name: string; input_schema: Record<string, unknown>; eager_input_streaming?: boolean };
    expect(tool.name).toBe("lesson");
    expect(tool.input_schema.type).toBe("object");
    expect(JSON.stringify(tool.input_schema)).toContain('"oneOf"');
    expect(tool.eager_input_streaming).toBeUndefined();
    expect(p.tool_choice).toEqual({ type: "auto" });
    expect(p.output_config).toEqual({ effort: "max" });
    expect(p.betas).toBeUndefined();
    expect(JSON.stringify(p.messages)).toContain("calling the `lesson` tool exactly once");
  });
});

describe("readAnthropicMessage", () => {
  it("reads the tool input and sums cache tokens into input usage", () => {
    const msg = message({
      stop_reason: "tool_use",
      content: [
        { type: "thinking", thinking: "", signature: "x" },
        { type: "tool_use", id: "t1", name: "lesson", input: { id: "l1" } },
      ],
    });
    expect(readAnthropicMessage(msg, "tool", "lesson")).toEqual({
      data: { id: "l1" },
      usage: { inputTokens: 1110, outputTokens: 50 },
    });
  });

  it("parses structured-output text, and JSON text when the tool wasn't called", () => {
    expect(readAnthropicMessage(message({ content: [{ type: "text", text: '{"a":1}' }] }), "structured", null).data).toEqual({ a: 1 });
    expect(readAnthropicMessage(message({ content: [{ type: "text", text: '```json\n{"b":2}\n```' }] }), "tool", "lesson").data).toEqual({
      b: 2,
    });
  });

  it("turns refusals and truncation into AiOutputError", () => {
    const refusal = message({ stop_reason: "refusal", stop_details: { type: "refusal", category: "bio" }, content: [] } as never);
    expect(() => readAnthropicMessage(refusal, "structured", null)).toThrow(/declined.*bio/);
    const cut = message({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"a":' }] });
    try {
      readAnthropicMessage(cut, "structured", null);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AiOutputError);
      expect((error as AiOutputError).kind).toBe("truncated");
    }
  });
});

describe("mapAnthropicError", () => {
  it("classifies SDK errors", () => {
    const rate = mapAnthropicError(
      new Anthropic.RateLimitError(429, {}, "slow down", new Headers({ "retry-after": "7" })),
      "m",
    ) as AiProviderError;
    expect(rate).toBeInstanceOf(AiProviderError);
    expect(rate.retryable).toBe(true);
    expect(rate.retryAfterMs).toBe(7000);

    const overloaded = mapAnthropicError(new Anthropic.APIError(undefined, {}, "Overloaded", undefined, "overloaded_error"), "m");
    expect((overloaded as AiProviderError).retryable).toBe(true);
    expect((mapAnthropicError(new Anthropic.InternalServerError(500, {}, "boom", new Headers()), "m") as AiProviderError).retryable).toBe(true);
    expect((mapAnthropicError(new Anthropic.BadRequestError(400, {}, "bad", new Headers()), "m") as AiProviderError).retryable).toBe(false);
    expect(mapAnthropicError(new Anthropic.AuthenticationError(401, {}, "no", new Headers()), "m")).toBeInstanceOf(AiConfigError);
    expect(mapAnthropicError(new Anthropic.NotFoundError(404, {}, "no", new Headers()), "m")).toBeInstanceOf(AiConfigError);
    expect(mapAnthropicError(new Anthropic.APIUserAbortError(), "m")).toBeInstanceOf(AiAbortError);
    expect((mapAnthropicError(new Anthropic.APIConnectionError({ message: "reset" }), "m") as AiProviderError).retryable).toBe(true);
  });
});

describe("createAnthropicProvider (fake client, no network)", () => {
  const ok = message({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "lesson", input: { ok: true } }] });

  it("retries 429 / overloaded errors with backoff and then succeeds", async () => {
    const { client, seen } = fakeClient([
      new Anthropic.RateLimitError(429, {}, "slow", new Headers({ "retry-after": "0" })),
      new Anthropic.APIError(undefined, {}, "Overloaded", undefined, "overloaded_error"),
      ok,
    ]);
    const retries: number[] = [];
    const provider = createAnthropicProvider({
      apiKey: "test",
      client,
      retryBaseDelayMs: 1,
      onRetry: ({ attempt }) => retries.push(attempt),
    });
    const result = await provider.generateJSON(lessonRequest);
    expect(result.data).toEqual({ ok: true });
    expect(retries).toEqual([1, 2]);
    expect(seen).toHaveLength(3);
    expect(provider.name).toBe("anthropic");
    expect(provider.model).toBe("claude-opus-5-5");
  });

  it("does not retry a 400, but falls back from structured output to a tool when the schema is rejected", async () => {
    const { client, seen } = fakeClient([
      new Anthropic.BadRequestError(400, body("Schema is too complex for compilation."), undefined, new Headers()),
      message({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t", name: "course_outline", input: { title: "x" } }] }),
    ]);
    const provider = createAnthropicProvider({ apiKey: "test", client });
    const result = await provider.generateJSON(outlineRequest);
    expect(result.data).toEqual({ title: "x" });
    expect(seen[0].output_config?.format).toBeDefined();
    expect(seen[1].tools?.[0]).toMatchObject({ name: "course_outline" });

    const other = fakeClient([new Anthropic.BadRequestError(400, body("max_tokens: too large"), undefined, new Headers())]);
    await expect(createAnthropicProvider({ apiKey: "t", client: other.client }).generateJSON(lessonRequest)).rejects.toThrow(
      /rejected the request \(400\)/,
    );
    expect(other.seen).toHaveLength(1);
  });

  it("stops retrying when the signal aborts", async () => {
    const controller = new AbortController();
    const { client } = fakeClient([new Anthropic.APIError(undefined, {}, "Overloaded", undefined, "overloaded_error")]);
    const provider = createAnthropicProvider({ apiKey: "t", client, retryBaseDelayMs: 10_000 });
    const pending = provider.generateJSON({ ...lessonRequest, signal: controller.signal });
    setTimeout(() => controller.abort(), 5);
    await expect(pending).rejects.toBeInstanceOf(AiAbortError);
  });

  it("uses AI_MODEL when given", () => {
    expect(createAnthropicProvider({ apiKey: "t", model: "claude-sonnet-5-5", client: fakeClient([]).client }).model).toBe(
      "claude-sonnet-5-5",
    );
  });
});
