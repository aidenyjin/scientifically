import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, keyPreview, looksLikeApiKey, readApiKey } from "./keys";

const url = (q = "") => new URL(`http://localhost/api/agent${q}`);

describe("agent API keys", () => {
  it("generates distinct, well-formed keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a).not.toBe(b);
    expect(looksLikeApiKey(a)).toBe(true);
    expect(a).toMatch(/^sci_/);
    expect(keyPreview(a)).toBe(a.slice(0, 8));
  });

  it("hashes deterministically without storing the key", () => {
    const key = generateApiKey();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toContain(key.slice(4));
    expect(hashApiKey(key)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects things that aren't keys", () => {
    expect(looksLikeApiKey("sci_short")).toBe(false);
    expect(looksLikeApiKey("sk-ant-" + "a".repeat(32))).toBe(false);
    expect(looksLikeApiKey(" " + generateApiKey())).toBe(false);
  });

  it("reads the key from Authorization, X-Api-Key and (only when allowed) the query", () => {
    const key = generateApiKey();
    expect(readApiKey(new Headers({ authorization: `Bearer ${key}` }), url())).toBe(key);
    expect(readApiKey(new Headers({ authorization: `bearer   ${key}` }), url())).toBe(key);
    expect(readApiKey(new Headers({ "x-api-key": key }), url())).toBe(key);
    expect(readApiKey(new Headers(), url(`?key=${key}`))).toBeNull();
    expect(readApiKey(new Headers(), url(`?key=${key}`), { allowQuery: true })).toBe(key);
    expect(readApiKey(new Headers({ authorization: "Basic abc" }), url())).toBeNull();
    expect(readApiKey(new Headers(), url())).toBeNull();
  });
});
