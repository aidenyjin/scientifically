import { EXERCISE_TYPES, getCore, type Exercise, type ExerciseType } from "@/content/registry";
import { SCHEMA_VERSION, type ContentPack } from "@/content/schema/course";
import { isTypeReady } from "@/server/ai/generate";
import { buildContentReference } from "@/server/ai/prompts";
import { OPERATIONS, type Operation } from "./operations";

/**
 * The guide an outside AI agent reads before writing a course (GET
 * /api/agent, or the MCP `get_guide` tool). The format reference is the same
 * text the in-app generator's system prompt uses (buildContentReference), so
 * adding a question type, example or sim model updates this guide too.
 */
export type GuideMode = "http" | "mcp";

export const API_BASE = "/api/agent";

export function agentTypes(): ExerciseType[] {
  return EXERCISE_TYPES.filter(isTypeReady);
}

/** A tiny but complete pack built from registry examples (a test checks it validates). */
export function examplePack(): ContentPack {
  const lessonId = "what-is-density";
  const card = getCore("info_card").examples[0] as Exercise;
  const numeric = getCore("numeric").examples as Exercise[];
  const question = numeric.find((e) => e.skillTags.includes("matter.density")) ?? numeric[0];
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "density-basics",
    title: "Sink or Float? The Science of Density",
    subject: "physics",
    level: "Middle school",
    description: "Find out why some things float and others sink, and learn to calculate density.",
    units: [
      {
        id: "density",
        title: "Density",
        description: "Mass, volume and how tightly matter is packed.",
        lessons: [
          {
            id: lessonId,
            title: "What is density?",
            kind: "standard",
            objectives: ["Define density", "Calculate density from mass and volume"],
            exercises: [
              { ...card, id: `${lessonId}-1-intro` },
              { ...question, id: `${lessonId}-2-calculate` },
            ],
          },
        ],
      },
    ],
  };
}

const call = (op: Operation, mode: GuideMode) =>
  mode === "mcp" ? `\`${op.tool}\`` : `\`${op.method} ${op.path}\``;

function workflow(mode: GuideMode): string {
  const op = Object.fromEntries(OPERATIONS.map((o) => [o.tool, call(o, mode)])) as Record<Operation["tool"], string>;
  return `## How to add a course
1. If the user hasn't said, agree on the subject, topic, learner level and size. A typical course is 2–4 units of
   3–5 standard lessons plus one checkpoint lesson per unit, with 8–12 exercises per lesson.
2. Plan the outline first (units → lessons → 1–4 objectives and 2–5 skill tags each), then write the exercises.
3. Create the pack with its first unit: ${op.create_pack}. It is saved as a **draft** (learners can't see it yet).
   The reply has the pack's final \`id\` — use it from now on; it gets a suffix if your id was already taken.
4. Add each further unit with ${op.put_unit} (send the same unit id again to replace it).
5. Every reply lists \`problems\` found by the automatic checks, e.g.
   \`units.0.lessons.2.exercises.4 ("ph-scale-3-calc", numeric): answer should be 7.4\`. Fix them all by sending the
   corrected unit again. Schema errors are rejected outright (nothing is saved) with an \`errors\` list.
6. When every unit is in and \`problems\` is empty, publish: ${op.update_pack} with \`"status": "published"\`.
   Learners then find the course in the course switcher. Publishing is refused while problems remain.
7. Tell the user the course title, its id and the \`adminUrl\` from the reply (where they can review it).

Check a pack without saving it with ${op.validate_pack}. See existing courses with ${op.list_packs} and
${op.get_pack}. You can only change packs that were created through this API, and only drafts if your key
isn't allowed to publish (the reply says so).`;
}

function httpReference(origin: string): string {
  const rows = OPERATIONS.map((o) => `| \`${o.method} ${o.path}\` | ${o.body ? `\`${o.body}\`` : "—"} | ${o.summary} |`);
  return `## HTTP API
Base URL: ${origin}${API_BASE}. Send your key on every request: \`Authorization: Bearer <key>\`.
Bodies and replies are JSON (\`Content-Type: application/json\`), at most 5 MB.

| Endpoint | Body | What it does |
|---|---|---|
${rows.join("\n")}
| \`GET ${API_BASE}/schema\` | — | JSON Schema of a whole pack, if you want to check locally. |

Writes reply \`{ "id", "status", "problems": string[], "stats": { "units", "lessons", "exercises" }, "adminUrl" }\`.
Errors reply \`{ "error": string, "errors"?: string[] }\` with status 400 (bad request), 401 (missing or revoked
key), 403 (not allowed), 404, 413 (too large) or 422 (the pack is invalid; nothing was saved).

Example:
\`\`\`bash
curl -X POST ${origin}${API_BASE}/packs \\
  -H "Authorization: Bearer $SCIENTIFICALLY_KEY" -H "Content-Type: application/json" \\
  -d @pack.json   # {"pack": {...}}
\`\`\``;
}

function mcpReference(): string {
  const rows = OPERATIONS.filter((o) => o.tool !== "get_guide").map((o) => `- \`${o.tool}\` — ${o.summary}`);
  return `## Tools
${rows.join("\n")}

Writes return \`{ "id", "status", "problems", "stats", "adminUrl" }\`. A rejected write returns an error with the
exact problems; nothing was saved.`;
}

function structure(): string {
  return `## Pack structure
- Pack: \`schemaVersion\` (always ${SCHEMA_VERSION}), \`id\`, \`title\` (≤ 80 chars, inviting), \`subject\` (≤ 40, e.g.
  "chemistry"), \`level\` (≤ 60, e.g. "High school"), \`description\` (≤ 300, learner-facing), \`units\` (1–20).
- Unit: \`id\`, \`title\` (≤ 60), \`description\` (≤ 200), optional \`color\` (hex like "#1cb0f6"), \`lessons\` (1–12).
  Units build on each other, starting from what the level already knows.
- Lesson: \`id\`, \`title\` (≤ 60), \`kind\` ("standard" | "checkpoint"), \`objectives\` (1–4, each starting with a
  verb), \`exercises\` (1–20; aim for 8–12).
- A standard lesson covers one idea and starts with an \`info_card\`. Each unit ends with one "checkpoint" lesson that
  reviews the whole unit: no new ideas, mixed types, difficulty 2–5.
- Unit and lesson ids are slugs, unique across the pack and different from each other.

A minimal valid pack (a real course has far more exercises per lesson):
\`\`\`json
${JSON.stringify(examplePack(), null, 2)}
\`\`\``;
}

export function buildAgentGuide(opts: { origin: string; mode: GuideMode; types?: ExerciseType[] }): string {
  const types = opts.types ?? agentTypes();
  return [
    `# Writing courses for Scientifically
Scientifically is a Duolingo-style science learning app for laptops, and you can add courses to it. A course is
called a **pack**: units → lessons → bite-sized exercises, written as JSON. The app validates every pack, runs
automatic checks on every exercise (answers are recomputed, equations must balance, simulation targets must be
reachable, …) and plays it to learners exactly as written — so it must be correct, complete and self-contained.`,
    workflow(opts.mode),
    opts.mode === "mcp" ? mcpReference() : httpReference(opts.origin),
    structure(),
    buildContentReference({ types }),
  ].join("\n\n");
}

/** What the admin pastes into an agent that can make web requests. */
export function buildAgentPrompt(opts: { origin: string; key: string }): string {
  return `You can create science courses in my Scientifically app through its agent API.

API base URL: ${opts.origin}${API_BASE}
API key: ${opts.key}
Send the key on every request as the header "Authorization: Bearer ${opts.key}".

Start by reading the guide (GET ${opts.origin}${API_BASE} with that header): it explains the course format, the question types and the endpoints. Then write the course I ask for, fix every problem the API reports, and publish it once it's complete.`;
}

/** Connector URL for chat apps that add MCP servers by URL (the key rides in the query). */
export function mcpUrl(origin: string, key?: string): string {
  return `${origin}${API_BASE}/mcp${key ? `?key=${encodeURIComponent(key)}` : ""}`;
}
