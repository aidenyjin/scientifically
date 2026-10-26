import { describe, expect, it } from "vitest";
import { CAST } from "@/characters/cast";
import { EXERCISE_TYPES, getCore } from "@/content/registry";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { SIM_MODELS } from "@/sims/models";
import type { SimModel } from "@/sims/types";
import { getLessonJsonSchema } from "./generate";
import { mockOutline } from "./mock";
import {
  buildLessonPrompt,
  buildOutlinePrompt,
  buildRepairPrompt,
  buildSystemPrompt,
  describeSimModels,
  type PromptContext,
} from "./prompts";
import { generationParamsSchema } from "./schemas";

const params = generationParamsSchema.parse({
  subject: "physics",
  topic: "forces and motion",
  level: "Middle school",
  units: 2,
  lessonsPerUnit: 3,
  exercisesPerLesson: 12,
  tone: "playful",
  notes: "Use everyday examples like bikes.",
});
const ctx: PromptContext = { params, types: [...EXERCISE_TYPES] };

describe("buildSystemPrompt", () => {
  const system = buildSystemPrompt(ctx);

  it("includes every registered exercise type with its label, notes, schema and examples", () => {
    for (const type of EXERCISE_TYPES) {
      const core = getCore(type);
      expect(system).toContain(`## ${type} — ${core.label}`);
      if (core.promptNotes.trim()) expect(system).toContain(core.promptNotes.trim());
      expect(system).toContain(`"const":"${type}"`);
      for (const ex of core.examples) expect(system).toContain(JSON.stringify(ex));
    }
  });

  it("only lists the allowed types", () => {
    const narrow = buildSystemPrompt({ params, types: ["info_card", "true_false"] });
    expect(narrow).toContain("## true_false");
    expect(narrow).not.toContain("## multiple_choice");
    expect(narrow).toContain("Allowed types for this course: `info_card`, `true_false`");
  });

  it("includes the cast, the course params and the quality rules", () => {
    for (const id of CHARACTER_IDS) {
      expect(system).toContain(`"${id}" — ${CAST[id].name}`);
      expect(system).toContain(CAST[id].personality);
    }
    expect(system).toContain("Topic: forces and motion");
    expect(system).toContain("Learner level: Middle school");
    expect(system).toContain("Tone: playful");
    expect(system).toContain("Use everyday examples like bikes.");
    for (const phrase of ["SI units", "Exactly one unambiguous correct answer", "misconceptions", "teach *why*", "info_card", "Difficulty ramps", "laptop screen", "RichText"]) {
      expect(system).toContain(phrase);
    }
  });

  it("lists the simulation models from the live registry", () => {
    for (const model of SIM_MODELS) {
      expect(system).toContain(`"${model.id}" — ${model.title}`);
      for (const p of model.params) expect(system).toContain(`${p.name}: ${p.label}`);
      for (const o of model.outputs) expect(system).toContain(`${o.name}: ${o.label}`);
    }
  });

  it("describes sim params with ranges, and says so when there are none", () => {
    const model: SimModel = {
      id: "spring",
      title: "Spring",
      description: "Hooke's law.",
      params: [{ name: "k", label: "Spring constant", unit: "N/m", min: 10, max: 200, step: 10, default: 50 }],
      outputs: [{ name: "x", label: "Extension", unit: "m" }],
      run: () => ({ x: 0 }),
    };
    expect(describeSimModels([model])).toContain("- k: Spring constant (N/m), 10 to 200, step 10, default 50");
    expect(describeSimModels([])).toMatch(/do not write `simulation` exercises/);
  });

  it("is deterministic (cache-friendly)", () => {
    expect(buildSystemPrompt(ctx)).toBe(system);
  });
});

describe("stage prompts", () => {
  const outline = mockOutline(params, ctx.types);

  it("outline prompt states the exact structure", () => {
    const prompt = buildOutlinePrompt(ctx);
    expect(prompt).toContain("2 unit(s). Each unit has 3 lessons of kind \"standard\"");
    expect(prompt).toContain("exactly one final lesson of kind \"checkpoint\"");
    expect(buildOutlinePrompt({ ...ctx, params: { ...params, includeCheckpoints: false } })).toContain("no checkpoint lessons");
  });

  it("lesson prompt gives the lesson, its neighbours and the count", () => {
    const unit = outline.units[0];
    const lesson = unit.lessons[1];
    const prompt = buildLessonPrompt({ ctx, outline, unit, lesson, exerciseCount: 12, extraNotes: "Focus on friction." });
    expect(prompt).toContain(`▶ "${lesson.id}"`);
    expect(prompt).toContain(`"id": "${lesson.id}"`);
    expect(prompt).toContain(`Previous: "${unit.lessons[0].title}"`);
    expect(prompt).toContain(`Next: "${unit.lessons[2].title}"`);
    expect(prompt).toContain("exactly 12 exercises");
    expect(prompt).toContain("Focus on friction.");
    for (const tag of lesson.skillTags) expect(prompt).toContain(tag);
  });

  it("checkpoint prompt reviews the unit", () => {
    const unit = outline.units[0];
    const checkpoint = unit.lessons.find((l) => l.kind === "checkpoint")!;
    const prompt = buildLessonPrompt({ ctx, outline, unit, lesson: checkpoint, exerciseCount: 10 });
    expect(prompt).toContain("checkpoint");
    for (const l of unit.lessons.filter((x) => x.kind === "standard")) expect(prompt).toContain(l.title);
  });

  it("repair prompt carries the problems and the previous output", () => {
    const prompt = buildRepairPrompt("ORIGINAL", ["exercises.2: difficulty: Too big"], { a: 1 });
    expect(prompt.startsWith("ORIGINAL")).toBe(true);
    expect(prompt).toContain("- exercises.2: difficulty: Too big");
    expect(prompt).toContain('{"a":1}');
  });

  it("the lesson JSON schema covers every registered type", () => {
    const text = JSON.stringify(getLessonJsonSchema());
    for (const type of EXERCISE_TYPES) expect(text).toContain(`"const":"${type}"`);
    expect(text).not.toContain("$schema");
  });
});
