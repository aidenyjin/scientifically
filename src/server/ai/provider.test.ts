import { describe, expect, it, vi } from "vitest";
import { AiConfigError } from "./errors";
import { createOpenAiProvider } from "./openai";
import { getProvider } from "./provider";

describe("getProvider", () => {
  it("defaults to anthropic and errors clearly without a key", async () => {
    await expect(getProvider({})).rejects.toBeInstanceOf(AiConfigError);
    await expect(getProvider({})).rejects.toThrow(/ANTHROPIC_API_KEY is not set/);
    await expect(getProvider({ AI_PROVIDER: "openai" })).rejects.toThrow(/OPENAI_API_KEY is not set/);
    await expect(getProvider({ AI_PROVIDER: "gemini" })).rejects.toThrow(/Unknown AI_PROVIDER/);
    await expect(getProvider({ ANTHROPIC_API_KEY: "k", AI_EFFORT: "extreme" })).rejects.toThrow(/AI_EFFORT/);
  });

  it("builds each provider from env", async () => {
    const anthropic = await getProvider({ ANTHROPIC_API_KEY: "k" });
    expect([anthropic.name, anthropic.model]).toEqual(["anthropic", "claude-opus-5-5"]);
    const custom = await getProvider({ ANTHROPIC_API_KEY: "k", AI_MODEL: " claude-sonnet-5-5 " });
    expect(custom.model).toBe("claude-sonnet-5-5");
    expect((await getProvider({ AI_PROVIDER: "MOCK" })).name).toBe("mock");
    expect((await getProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k", AI_MODEL: "gpt-x" })).model).toBe("gpt-x");
  });
});

describe("openai provider (secondary, fake fetch)", () => {
  it("sends a json_schema response_format, parses the reply and retries 5xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "busy" } }), { status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ finish_reason: "stop", message: { content: '{"ok":true}' } }],
            usage: { prompt_tokens: 12, completion_tokens: 3 },
          }),
          { status: 200 },
        ),
      );
    const provider = createOpenAiProvider({ apiKey: "k", model: "gpt-test", fetch: fetchMock as unknown as typeof fetch });
    const result = await provider.generateJSON({
      system: "S",
      prompt: "P",
      schema: { type: "object", properties: {} },
      schemaName: "lesson",
      maxTokens: 100,
    });
    expect(result).toEqual({ data: { ok: true }, usage: { inputTokens: 12, outputTokens: 3 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string);
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { name: "lesson", strict: false } });
    expect(body.messages[0]).toEqual({ role: "system", content: "S" });
  });
});
