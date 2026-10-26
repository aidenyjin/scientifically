import { z } from "zod";
import { AiOutputError } from "./errors";

/** A JSON Schema document (as produced by `z.toJSONSchema`). */
export type JsonSchema = { [key: string]: unknown };

const isObject = (v: unknown): v is JsonSchema => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * JSON Schema for a Zod schema, describing what the model should *write*
 * (`io: "input"`, so defaulted fields are optional). Refinements can't be
 * represented and are checked by Zod afterwards.
 */
export function jsonSchemaFor(schema: z.ZodType): JsonSchema {
  const out = z.toJSONSchema(schema, { unrepresentable: "any", io: "input" }) as JsonSchema;
  delete out.$schema;
  return out;
}

/**
 * Limits for grammar-constrained ("strict") output on the Claude API
 * (structured outputs docs, Oct 2026): optional properties and union-typed
 * properties are counted across the whole schema.
 */
export const STRICT_LIMITS = { optionalProperties: 24, unions: 16 } as const;

/** Keywords strict mode rejects; we move them into `description` so the model still sees them. */
const MOVED_KEYWORDS = [
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "maxItems",
  "uniqueItems",
  "minProperties",
  "maxProperties",
] as const;

const SUPPORTED_FORMATS = new Set([
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "uri",
  "ipv4",
  "ipv6",
  "uuid",
]);

/** Regex features the strict grammar compiler does not support. */
const UNSUPPORTED_PATTERN = /\(\?[=!<]|\\[1-9]|\\[bB]|\{\d{3,}|\{\d+,\d{3,}\}/;

export interface StrictSchemaResult {
  /** Sanitised schema for `output_config.format` (only meaningful when `compatible`). */
  schema: JsonSchema;
  /** True when strict mode can represent the schema faithfully and it is within the limits. */
  compatible: boolean;
  /** Why it is not compatible (empty when compatible). */
  issues: string[];
  optionalProperties: number;
  unions: number;
}

/**
 * Convert a JSON Schema into the subset that Claude's structured outputs
 * accept: `oneOf` → `anyOf`, `additionalProperties: false` on every object,
 * unsupported constraints moved into descriptions. Things that would change
 * the meaning (records/maps, tuples, unconstrained values, recursion) make the
 * result incompatible instead of being silently dropped; callers then fall
 * back to an unconstrained tool call and rely on Zod validation.
 */
export function toStrictSchema(input: JsonSchema): StrictSchemaResult {
  const issues: string[] = [];
  let optionalProperties = 0;
  let unions = 0;

  const visit = (node: unknown, path: string): JsonSchema => {
    if (!isObject(node)) {
      issues.push(`${path}: schema is not an object`);
      return {};
    }
    const src: JsonSchema = { ...node };
    const out: JsonSchema = {};
    const moved: string[] = [];
    delete src.$schema;
    delete src.$id;

    if (isObject(src.$defs)) {
      out.$defs = Object.fromEntries(Object.entries(src.$defs).map(([k, v]) => [k, visit(v, `${path}.$defs.${k}`)]));
    }
    delete src.$defs;
    if (typeof src.$ref === "string") {
      if (src.$ref === "#") issues.push(`${path}: recursive schema`);
      out.$ref = src.$ref;
      return out;
    }

    const variants = Array.isArray(src.anyOf) ? src.anyOf : Array.isArray(src.oneOf) ? src.oneOf : null;
    if (variants) {
      unions++;
      out.anyOf = variants.map((v, i) => visit(v, `${path}.anyOf.${i}`));
    } else if (Array.isArray(src.allOf)) {
      out.allOf = src.allOf.map((v, i) => visit(v, `${path}.allOf.${i}`));
    }
    if (Array.isArray(src.type)) unions++;
    if (src.type !== undefined) out.type = src.type;
    if (src.const !== undefined) out.const = src.const;
    if (Array.isArray(src.enum)) out.enum = src.enum;
    if (src.default !== undefined) out.default = src.default;
    if (
      out.type === undefined &&
      out.anyOf === undefined &&
      out.allOf === undefined &&
      out.const === undefined &&
      out.enum === undefined
    ) {
      issues.push(`${path}: unconstrained value (any)`);
    }

    if (src.type === "object") {
      const properties = isObject(src.properties) ? src.properties : {};
      const required = Array.isArray(src.required) ? src.required.filter((r): r is string => typeof r === "string") : [];
      out.properties = Object.fromEntries(
        Object.entries(properties).map(([k, v]) => [k, visit(v, `${path}.${k}`)]),
      );
      optionalProperties += Object.keys(properties).filter((k) => !required.includes(k)).length;
      if (required.length) out.required = required;
      if (isObject(src.additionalProperties) || src.propertyNames !== undefined || isObject(src.patternProperties)) {
        issues.push(`${path}: map/record objects (additionalProperties schema) are not supported`);
      }
      out.additionalProperties = false;
    }

    if (src.type === "array") {
      if (src.prefixItems !== undefined) issues.push(`${path}: tuple arrays (prefixItems) are not supported`);
      if (src.items !== undefined) out.items = visit(src.items, `${path}[]`);
      if (typeof src.minItems === "number") {
        if (src.minItems <= 1) out.minItems = src.minItems;
        else moved.push(`minItems: ${src.minItems}`);
      }
    }

    if (src.type === "string") {
      if (typeof src.format === "string") {
        if (SUPPORTED_FORMATS.has(src.format)) out.format = src.format;
        else moved.push(`format: ${JSON.stringify(src.format)}`);
      }
      if (typeof src.pattern === "string") {
        if (UNSUPPORTED_PATTERN.test(src.pattern)) moved.push(`pattern: ${JSON.stringify(src.pattern)}`);
        else out.pattern = src.pattern;
      }
    }

    for (const key of MOVED_KEYWORDS) {
      if (src[key] !== undefined) moved.push(`${key}: ${JSON.stringify(src[key])}`);
    }
    for (const key of ["not", "if", "then", "else", "contains", "dependentSchemas", "dependentRequired"]) {
      if (src[key] !== undefined) issues.push(`${path}: keyword "${key}" is not supported`);
    }

    const description = typeof src.description === "string" ? src.description : "";
    const extra = moved.length ? `{${moved.join(", ")}}` : "";
    if (description || extra) out.description = [description, extra].filter(Boolean).join("\n\n");
    if (typeof src.title === "string") out.title = src.title;
    return out;
  };

  const schema = visit(input, "(root)");
  if (optionalProperties > STRICT_LIMITS.optionalProperties) {
    issues.push(`${optionalProperties} optional properties (limit ${STRICT_LIMITS.optionalProperties})`);
  }
  if (unions > STRICT_LIMITS.unions) issues.push(`${unions} union-typed properties (limit ${STRICT_LIMITS.unions})`);
  return { schema, compatible: issues.length === 0, issues, optionalProperties, unions };
}

/**
 * Parse JSON from model text: the whole text, else a ```json fenced block,
 * else the outermost {...}. Throws AiOutputError("invalid_json").
 */
export function parseJsonFromText(text: string): unknown {
  const attempts: string[] = [text.trim()];
  const fence = /```(?:json)?\s*\n([\s\S]*?)\n?```/.exec(text);
  if (fence) attempts.push(fence[1].trim());
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) attempts.push(text.slice(first, last + 1));
  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  throw new AiOutputError(
    text.trim() ? "invalid_json" : "no_output",
    text.trim() ? "The reply was not valid JSON." : "The reply was empty.",
    text,
  );
}
