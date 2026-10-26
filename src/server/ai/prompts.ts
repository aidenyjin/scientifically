import { CAST } from "@/characters/cast";
import { getCore, type ExerciseType } from "@/content/registry";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { SIM_MODELS } from "@/sims/models";
import type { SimModel } from "@/sims/types";
import { jsonSchemaFor } from "./json-schema";
import type { CourseOutline, GenerationParams, OutlineLesson, OutlineUnit } from "./schemas";

/**
 * Prompt builders. Everything the model is told about the app comes from
 * code: the Zod schemas, each registered type's examples and promptNotes,
 * the cast and the simulation models. Nothing here is a hand-maintained copy,
 * so adding a type, an example or a sim model updates the prompts.
 *
 * The system prompt is identical for every call of one job (so it is cached);
 * stage-specific instructions go in the user prompt.
 */

export interface PromptContext {
  params: GenerationParams;
  /** Exercise types the model may use (already filtered for readiness). */
  types: ExerciseType[];
  /** Defaults to the live SIM_MODELS registry. */
  simModels?: readonly SimModel[];
}

const json = (value: unknown) => JSON.stringify(value, null, 2);
const compact = (value: unknown) => JSON.stringify(value);
const fence = (value: unknown, pretty = false) => "```json\n" + (pretty ? json(value) : compact(value)) + "\n```";

export function describeCourse(params: GenerationParams): string {
  const lines = [
    `- Subject: ${params.subject}`,
    `- Topic: ${params.topic}`,
    `- Learner level: ${params.level}`,
    `- Size: ${params.units} unit(s) × ${params.lessonsPerUnit} standard lessons${
      params.includeCheckpoints ? " + 1 checkpoint lesson per unit" : ""
    }; about ${params.exercisesPerLesson} exercises per lesson`,
  ];
  if (params.tone) lines.push(`- Tone: ${params.tone}`);
  if (params.notes) lines.push(`- Notes from the course author: ${params.notes}`);
  return lines.join("\n");
}

const CONTRACT = `# Content contract
Content is JSON validated against Zod schemas (JSON Schemas below) and played directly by the app.
- A pack has units; a unit has lessons; a lesson has exercises. A lesson is
  { "id", "title", "kind": "standard" | "checkpoint", "objectives": string[1–4], "exercises": Exercise[] }.
- Every exercise has the base fields: "id", "type", "prompt" (instruction or question at the top of the screen),
  "explanation" (shown after answering, right or wrong), optional "hint", "skillTags" (≥1), "difficulty" (integer 1–5)
  and optional "characterId". Each type adds its own fields (see "Exercise types").
- ids are lowercase slugs (a–z, 0–9 and single hyphens, e.g. "ph-scale-basics") and must be unique across the whole pack.
  Exercise ids start with their lesson id, e.g. "ph-scale-basics-3-indicator-colours".
- skillTags are dotted lowercase ids from general to specific, e.g. "acids.ph-scale". Reuse the lesson's planned tags
  so spaced repetition can group exercises; every graded exercise needs at least one.
- difficulty: 1 = recall a fact just taught, 3 = apply it, 5 = multi-step reasoning or a tricky misconception.
- Option lists are shuffled by the app: never write "all of the above", "both A and B" or refer to option positions.

# Text markup (RichText)
All text fields support only this markup: **bold**, *italic*, subscripts with _{…} (H_{2}O, CO_{2}) and superscripts with
^{…} (m/s^{2}, 10^{-3}, Ca^{2+}). No LaTeX, no $…$, no HTML, no Markdown headings, lists, tables, links, code or emoji.
Use Unicode symbols where needed: × ÷ − ± ≈ ≤ ≥ → ⇌ ° Δ λ μ Ω π ρ.`;

const QUALITY_RULES = `# Quality rules
1. Scientifically accurate and up to date for the stated level. Simplify, but never teach something false. Avoid contested
   or obsolete claims; give numbers with sensible significant figures.
2. SI units throughout (with the usual exceptions for the level, e.g. °C, L, g/cm^{3}); always state units in numeric
   questions; use correct unit markup (m/s^{2}, mol/dm^{3}).
3. Exactly one unambiguous correct answer (or one exact set / order / mapping for those types). If a careful expert
   could argue for another option, rewrite the item.
4. Distractors are plausible and come from real misconceptions or common calculation slips — never jokes, never
   obviously wrong, and similar in length and style to the correct answer.
5. Explanations teach *why*: say why the right answer is right and why the tempting wrong answer is wrong, in 1–3
   sentences. Don't just restate the answer.
6. Introduce before testing: put an info_card before each genuinely new idea (always first in a standard lesson), then
   practise it. Never test something the course has not taught yet or that the level would not know.
7. Vary the exercise types within a lesson; don't use the same type more than three times in a row.
8. Difficulty ramps within a lesson: start at 1–2, end at 3–4 (checkpoints range 2–5).
9. Short text that fits a laptop screen without scrolling: prompts ≤ 25 words, options ≤ 12 words, info-card paragraphs
   ≤ 40 words, explanations ≤ 50 words.
10. Characters are seasoning: put a characterId on roughly one exercise in four, matching the character's field, and
    keep dialogue lines in character (see the cast). Lumi fits any topic.
11. Use only the RichText markup above. Write for an international audience; avoid culture-specific references.
12. Self-check before answering: re-solve every question, recompute every number, and confirm every index field
    (answerIndex, answerIndices, errorIndex, categoryId…) points at the intended item.`;

export function describeCast(): string {
  const lines = CHARACTER_IDS.map((id) => {
    const c = CAST[id];
    return `- "${id}" — ${c.name} (${c.field}): ${c.personality}`;
  });
  return `# Characters (characterId)\n${lines.join("\n")}`;
}

export function describeSimModels(models: readonly SimModel[] = SIM_MODELS): string {
  if (models.length === 0) return "# Simulation models\nNone are available: do not write `simulation` exercises.";
  const blocks = models.map((m) => {
    const params = m.params
      .map((p) => `    - ${p.name}: ${p.label} (${p.unit || "no unit"}), ${p.min} to ${p.max}, step ${p.step}, default ${p.default}`)
      .join("\n");
    const outputs = m.outputs.map((o) => `    - ${o.name}: ${o.label} (${o.unit || "no unit"})`).join("\n");
    return `- "${m.id}" — ${m.title}: ${m.description}\n  params:\n${params}\n  outputs:\n${outputs}`;
  });
  return `# Simulation models (for the \`simulation\` type)
Use only these model ids, param names and output names. The goal target must be reachable with the adjustable sliders
inside their ranges and steps (it is checked automatically); fixed params must be inside their ranges.
${blocks.join("\n")}`;
}

export function describeExerciseType(type: ExerciseType): string {
  const core = getCore(type);
  const parts = [`## ${type} — ${core.label}`];
  if (core.graded === false) parts.push("Not graded (no hearts or XP); used for teaching.");
  if (core.promptNotes.trim()) parts.push(`How to write it well: ${core.promptNotes.trim()}`);
  parts.push("JSON Schema:\n" + fence(jsonSchemaFor(core.schema)));
  if (core.examples.length) {
    parts.push(`Example${core.examples.length > 1 ? "s" : ""} (match the shape and quality; don't copy the topic):`);
    for (const ex of core.examples) parts.push(fence(ex));
  }
  return parts.join("\n");
}

/** Stable system prompt shared by every call of a job. */
export function buildSystemPrompt(ctx: PromptContext): string {
  return [
    `You are a senior science educator and assessment writer creating course content for "Scientifically", a
Duolingo-style science learning app used on laptops. Learners work through short lessons of bite-sized exercises.
You write the content as JSON; the app validates it and plays it as-is, so it must be correct, complete and
self-contained.`,
    `# This course\n${describeCourse(ctx.params)}`,
    CONTRACT,
    QUALITY_RULES,
    describeCast(),
    describeSimModels(ctx.simModels),
    `# Exercise types\nAllowed types for this course: ${ctx.types.map((t) => `\`${t}\``).join(", ")}. Use no others.\n\n` +
      ctx.types.map(describeExerciseType).join("\n\n"),
  ].join("\n\n");
}

const TYPE_HINTS: [ExerciseType, string][] = [
  ["numeric", "calculations → numeric"],
  ["equation_balance", "reactions → equation_balance"],
  ["graph_read", "data → graph_read"],
  ["graph_plot", "relationships → graph_plot"],
  ["simulation", "experiments → simulation"],
  ["ordering", "processes → ordering"],
  ["categorize", "classification → categorize"],
];

function typeHints(types: readonly ExerciseType[]): string {
  const hints = TYPE_HINTS.filter(([t]) => types.includes(t)).map(([, h]) => h);
  return hints.length ? ` (e.g. ${hints.join(", ")})` : "";
}

export function buildOutlinePrompt(ctx: PromptContext): string {
  const { params } = ctx;
  const graded = ctx.types.filter((t) => getCore(t).graded !== false);
  return `# Task: plan the course outline
Plan a course on "${params.topic}" (${params.subject}) for ${params.level} learners.

Structure, exactly:
- ${params.units} unit(s). Each unit has ${params.lessonsPerUnit} lessons of kind "standard"${
    params.includeCheckpoints
      ? `, followed by exactly one final lesson of kind "checkpoint" that reviews the whole unit`
      : `, and no checkpoint lessons`
  }.
- Units build on each other: start from what a ${params.level} learner already knows and progress logically.
  Each standard lesson covers one coherent idea (2–4 objectives), small enough for ~${params.exercisesPerLesson} exercises.
- Pack: "title" (≤ 80 chars, inviting, not just the topic name) and "description" (≤ 300 chars, learner-facing).
- Unit: "id" (slug), "title" (≤ 60 chars), "description" (≤ 200 chars); "color" is optional (hex like "#1cb0f6").
- Lesson: "id" (slug, unique across the pack and different from unit ids), "title" (≤ 60 chars), "kind",
  "objectives" (1–4, each starting with a verb, e.g. "Calculate pH from [H^{+}]"), "skillTags" (2–5 dotted ids that the
  lesson's exercises will use; checkpoints reuse the unit's tags) and "exerciseTypes" (3–6 types from the allowed list
  that best fit the objectives, most important first; standard lessons start with "info_card").
- Spread the types across the course: besides multiple_choice and true_false, use ${graded
    .filter((t) => !["multiple_choice", "true_false"].includes(t))
    .map((t) => `\`${t}\``)
    .join(", ")} wherever they genuinely fit the topic${typeHints(ctx.types)}.

Return only the outline JSON (schema name "course_outline").`;
}

/** Compact outline overview for lesson prompts (titles and objectives only). */
export function describeOutline(outline: CourseOutline, currentLessonId: string): string {
  return outline.units
    .map((u, ui) => {
      const lessons = u.lessons
        .map((l) => `  - ${l.id === currentLessonId ? "▶ " : ""}"${l.id}" (${l.kind}): ${l.title}`)
        .join("\n");
      return `- Unit ${ui + 1} "${u.id}": ${u.title}\n${lessons}`;
    })
    .join("\n");
}

function neighbour(label: string, lesson: OutlineLesson | undefined): string {
  if (!lesson) return `- ${label}: none`;
  return `- ${label}: "${lesson.title}" — ${lesson.objectives.join("; ")}`;
}

export interface LessonPromptInput {
  ctx: PromptContext;
  outline: CourseOutline;
  unit: OutlineUnit;
  lesson: OutlineLesson;
  exerciseCount: number;
  /** Extra instructions, e.g. from an admin regenerating the lesson. */
  extraNotes?: string;
}

export function buildLessonPrompt({ ctx, outline, unit, lesson, exerciseCount, extraNotes }: LessonPromptInput): string {
  const flat = outline.units.flatMap((u) => u.lessons);
  const index = flat.findIndex((l) => l.id === lesson.id);
  const isCheckpoint = lesson.kind === "checkpoint";
  const planned = lesson.exerciseTypes.filter((t) => ctx.types.includes(t));
  const unitTags = [...new Set(unit.lessons.flatMap((l) => l.skillTags))];
  const unitLessons = unit.lessons.filter((l) => l.kind === "standard");

  const specific = isCheckpoint
    ? `This is the unit's **checkpoint**: a review of everything in unit "${unit.title}" —
${unitLessons.map((l) => `  - "${l.title}": ${l.objectives.join("; ")}`).join("\n")}
- Mix exercise types; cover every lesson of the unit; difficulty 2–5. No new ideas, so no info_card (at most one recap card).
- Use the unit's skill tags: ${unitTags.map((t) => `"${t}"`).join(", ")}.`
    : `- Start with an info_card that introduces the lesson's first new idea; add at most one more info_card before a
  second new idea. Every other exercise is graded.
- Planned types (use most of these): ${planned.map((t) => `\`${t}\``).join(", ")}. You may also use other allowed types.
- Use the lesson's skill tags: ${lesson.skillTags.map((t) => `"${t}"`).join(", ")}.`;

  return `# Task: write one lesson
Course outline (for context — write only the lesson marked ▶):
${describeOutline(outline, lesson.id)}

Neighbouring lessons (don't repeat their content; the previous one may be assumed known):
${neighbour("Previous", flat[index - 1])}
${neighbour("Next", flat[index + 1])}

## The lesson to write
${fence({ id: lesson.id, title: lesson.title, kind: lesson.kind, objectives: lesson.objectives }, true)}

Requirements:
- Return the lesson object with exactly this "id", "title", "kind" and "objectives".
- Write exactly ${exerciseCount} exercises that together achieve every objective, in a sensible teaching order.
${specific}
- Exercise ids: "${lesson.id}-<n>-<short-slug>", e.g. "${lesson.id}-1-${isCheckpoint ? "review" : "intro"}".
- Follow the content contract, the quality rules and each type's JSON Schema exactly.${
    extraNotes ? `\n\nAdditional instructions for this lesson:\n${extraNotes}` : ""
  }

Return only the lesson JSON (schema name "lesson").`;
}

/** Wraps a prompt with the problems found in the previous attempt, for a retry. */
export function buildRepairPrompt(originalPrompt: string, problems: string[], previousOutput: unknown): string {
  const previous =
    previousOutput === undefined
      ? "(no usable output)"
      : fence(previousOutput);
  return `${originalPrompt}

# Your previous attempt had problems
Fix every problem listed below and return the complete corrected JSON (everything, not just the changed parts).
Keep the parts that had no problems as they were. Paths are JSON paths into your previous attempt.

Problems:
${problems.map((p) => `- ${p}`).join("\n")}

Previous attempt:
${previous}`;
}
