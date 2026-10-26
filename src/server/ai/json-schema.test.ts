import { describe, expect, it } from "vitest";
import { z } from "zod";
import { EXERCISE_TYPES } from "@/content/registry";
import { AiOutputError } from "./errors";
import { getLessonJsonSchema, getOutlineJsonSchema } from "./generate";
import { jsonSchemaFor, parseJsonFromText, toStrictSchema } from "./json-schema";

describe("toStrictSchema", () => {
  it("accepts the outline schema and narrows its type enum", () => {
    const schema = getOutlineJsonSchema(["info_card", "numeric"]);
    expect(JSON.stringify(schema)).toContain('"enum":["info_card","numeric"]');
    const strict = toStrictSchema(schema);
    expect(strict.issues).toEqual([]);
    expect(strict.compatible).toBe(true);
    const text = JSON.stringify(strict.schema);
    expect(text).not.toMatch(/"(minLength|maxLength|maxItems)"/);
    expect(text).toContain('"additionalProperties":false');
  });

  it("rejects the lesson schema (records, tuples, too many optional fields)", () => {
    const strict = toStrictSchema(getLessonJsonSchema());
    expect(strict.compatible).toBe(false);
    expect(strict.issues.join("\n")).toMatch(/optional properties/);
    // All registered types are still in the (unconstrained) tool schema.
    for (const t of EXERCISE_TYPES) expect(JSON.stringify(getLessonJsonSchema())).toContain(`"${t}"`);
  });

  it("moves unsupported constraints into descriptions and maps oneOf → anyOf", () => {
    const schema = jsonSchemaFor(
      z.object({
        name: z.string().min(2).max(10).describe("Name"),
        n: z.number().int().min(1).max(5),
        tags: z.array(z.string()).min(3),
        pick: z.discriminatedUnion("k", [z.object({ k: z.literal("a") }), z.object({ k: z.literal("b") })]),
      }),
    );
    const strict = toStrictSchema(schema);
    expect(strict.compatible).toBe(true);
    const props = strict.schema.properties as Record<string, Record<string, unknown>>;
    expect(props.name.description).toBe('Name\n\n{minLength: 2, maxLength: 10}');
    expect(props.n.minimum).toBeUndefined();
    expect(props.n.description).toContain("minimum: 1");
    expect(props.tags.minItems).toBeUndefined();
    expect(props.tags.description).toContain("minItems: 3");
    expect(props.pick.anyOf).toHaveLength(2);
    expect(strict.unions).toBe(1);
  });

  it("flags records instead of silently emptying them", () => {
    const strict = toStrictSchema(jsonSchemaFor(z.object({ vars: z.record(z.string(), z.number()) })));
    expect(strict.compatible).toBe(false);
    expect(strict.issues[0]).toMatch(/record/);
  });
});

describe("parseJsonFromText", () => {
  it("parses plain, fenced and embedded JSON", () => {
    expect(parseJsonFromText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonFromText('Here you go:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseJsonFromText('Sure! {"a":3} Hope that helps.')).toEqual({ a: 3 });
  });

  it("throws AiOutputError for empty or broken text", () => {
    expect(() => parseJsonFromText("")).toThrow(AiOutputError);
    try {
      parseJsonFromText("{nope");
    } catch (error) {
      expect((error as AiOutputError).kind).toBe("invalid_json");
    }
  });
});
