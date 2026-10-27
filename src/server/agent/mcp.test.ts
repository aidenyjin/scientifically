import { describe, expect, it } from "vitest";
import { handleMcpPayload, MCP_PROTOCOL_VERSIONS, RPC_ERRORS, type McpServer } from "./mcp";

const server: McpServer = {
  name: "test",
  title: "Test",
  version: "1.0.0",
  instructions: "Use the tools.",
  tools: [
    {
      name: "echo",
      title: "Echo",
      description: "Echo the text back.",
      inputSchema: { type: "object", properties: { text: { type: "string" } } },
      annotations: { readOnlyHint: true },
      run: async (args) => ({ text: String(args.text ?? "") }),
    },
    {
      name: "fail",
      title: "Fail",
      description: "Always fails.",
      inputSchema: { type: "object" },
      run: async () => {
        throw new Error("boom");
      },
    },
  ],
};

const call = (method: string, params?: unknown, id: number | string = 1) => ({ jsonrpc: "2.0", id, method, params });

describe("MCP handler", () => {
  it("initializes, echoing a supported protocol version and the instructions", async () => {
    const reply = await handleMcpPayload(call("initialize", { protocolVersion: "2025-06-18", capabilities: {} }), server);
    expect(reply).toMatchObject({
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "test", version: "1.0.0" },
        instructions: "Use the tools.",
      },
    });
  });

  it("answers an unknown protocol version with its newest one", async () => {
    const reply = await handleMcpPayload(call("initialize", { protocolVersion: "1999-01-01" }), server);
    expect(reply).toMatchObject({ result: { protocolVersion: MCP_PROTOCOL_VERSIONS[0] } });
  });

  it("lists tools without their implementations", async () => {
    const reply = (await handleMcpPayload(call("tools/list"), server)) as { result: { tools: object[] } };
    expect(reply.result.tools).toEqual([
      {
        name: "echo",
        title: "Echo",
        description: "Echo the text back.",
        inputSchema: { type: "object", properties: { text: { type: "string" } } },
        annotations: { readOnlyHint: true },
      },
      { name: "fail", title: "Fail", description: "Always fails.", inputSchema: { type: "object" } },
    ]);
  });

  it("calls tools and reports thrown errors as tool errors the model can read", async () => {
    expect(await handleMcpPayload(call("tools/call", { name: "echo", arguments: { text: "hi" } }), server)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: { content: [{ type: "text", text: "hi" }], isError: false },
    });
    expect(await handleMcpPayload(call("tools/call", { name: "fail" }), server)).toMatchObject({
      result: { content: [{ type: "text", text: "boom" }], isError: true },
    });
    expect(await handleMcpPayload(call("tools/call", { name: "nope" }), server)).toMatchObject({
      error: { code: RPC_ERRORS.invalidParams },
    });
  });

  it("returns protocol errors for bad messages and unknown methods", async () => {
    expect(await handleMcpPayload(call("resources/list"), server)).toMatchObject({ error: { code: RPC_ERRORS.methodNotFound } });
    expect(await handleMcpPayload({ id: 3, method: "ping" }, server)).toMatchObject({
      id: 3,
      error: { code: RPC_ERRORS.invalidRequest },
    });
    expect(await handleMcpPayload([], server)).toMatchObject({ error: { code: RPC_ERRORS.invalidRequest } });
  });

  it("needs no reply for notifications and client responses", async () => {
    expect(await handleMcpPayload({ jsonrpc: "2.0", method: "notifications/initialized" }, server)).toBeNull();
    expect(await handleMcpPayload({ jsonrpc: "2.0", id: 9, result: {} }, server)).toBeNull();
  });

  it("handles batches, dropping replies to notifications", async () => {
    const reply = await handleMcpPayload(
      [call("ping", undefined, "a"), { jsonrpc: "2.0", method: "notifications/initialized" }, call("ping", undefined, "b")],
      server,
    );
    expect(reply).toEqual([
      { jsonrpc: "2.0", id: "a", result: {} },
      { jsonrpc: "2.0", id: "b", result: {} },
    ]);
  });
});
