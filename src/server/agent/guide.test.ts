import { describe, expect, it } from "vitest";
import { getCore } from "@/content/registry";
import { validatePack } from "@/content/schema/course";
import { checkPack } from "@/server/ai/validate";
import { agentTypes, buildAgentGuide, buildAgentPrompt, examplePack, mcpUrl } from "./guide";
import { OPERATIONS } from "./operations";

const origin = "https://sci.example.com";

describe("agent guide", () => {
  it("ships an example pack that validates and passes every automatic check", () => {
    const pack = examplePack();
    expect(validatePack(pack).ok).toBe(true);
    expect(checkPack(pack).errors).toEqual([]);
  });

  it("documents every ready exercise type with its schema and examples", () => {
    const guide = buildAgentGuide({ origin, mode: "http" });
    for (const type of agentTypes()) {
      expect(guide).toContain(`## ${type} — ${getCore(type).label}`);
      expect(guide).toContain(JSON.stringify(getCore(type).examples[0]));
    }
    expect(guide).toContain("# Quality rules");
    expect(guide).toContain("# Characters (characterId)");
  });

  it("lists HTTP endpoints with the absolute base URL in http mode", () => {
    const guide = buildAgentGuide({ origin, mode: "http" });
    for (const op of OPERATIONS) expect(guide).toContain(`\`${op.method} ${op.path}\``);
    expect(guide).toContain(`Base URL: ${origin}/api/agent`);
    expect(guide).toContain("Authorization: Bearer");
  });

  it("refers to tool names in mcp mode", () => {
    const guide = buildAgentGuide({ origin, mode: "mcp" });
    for (const op of OPERATIONS.filter((o) => o.tool !== "get_guide")) expect(guide).toContain(`\`${op.tool}\``);
    expect(guide).not.toContain("POST /api/agent/packs");
  });

  it("builds a paste-ready prompt and connector URL", () => {
    const key = "sci_" + "a".repeat(32);
    const prompt = buildAgentPrompt({ origin, key });
    expect(prompt).toContain(`${origin}/api/agent`);
    expect(prompt).toContain(`Authorization: Bearer ${key}`);
    expect(mcpUrl(origin, key)).toBe(`${origin}/api/agent/mcp?key=${key}`);
    expect(mcpUrl(origin)).toBe(`${origin}/api/agent/mcp`);
  });
});
