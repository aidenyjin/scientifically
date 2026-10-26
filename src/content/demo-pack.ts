import { exerciseCores, type Exercise, type ExerciseType } from "./registry";
import { SCHEMA_VERSION, type ContentPack, type Lesson, type Unit } from "./schema/course";

/**
 * The demo pack is assembled from every exercise type's `examples`, so adding
 * a type (or examples) automatically shows up here. It is demo/test data, not
 * course content — real packs come from the AI pipeline.
 */
// Deep copies: callers may mutate the pack, and the registry examples are shared.
const examplesOf = (type: ExerciseType): Exercise[] =>
  structuredClone((exerciseCores.find((c) => c.type === type)?.examples ?? []) as Exercise[]);

function lesson(id: string, title: string, objectives: string[], types: ExerciseType[]): Lesson | null {
  const exercises = types.flatMap(examplesOf);
  if (exercises.length === 0) return null;
  return { id, title, kind: "standard", objectives, exercises };
}

function checkpoint(id: string, lessons: (Lesson | null)[]): Lesson | null {
  const exercises = lessons
    .filter((l): l is Lesson => l !== null)
    .flatMap((l) => l.exercises.filter((e) => e.type !== "info_card").slice(0, 3))
    .map((e) => ({ ...e, id: `${e.id}-review` }));
  if (exercises.length === 0) return null;
  return { id, title: "Checkpoint", kind: "checkpoint", objectives: ["Review the unit"], exercises };
}

function unit(id: string, title: string, description: string, color: string, lessons: (Lesson | null)[]): Unit {
  const real = lessons.filter((l): l is Lesson => l !== null);
  const cp = checkpoint(`${id}-checkpoint`, real);
  return { id, title, description, color, lessons: cp ? [...real, cp] : real };
}

export function buildDemoPack(): ContentPack {
  const u1 = [
    lesson("demo-choices", "Quick choices", ["Pick answers from options"], [
      "info_card",
      "multiple_choice",
      "true_false",
      "multi_select",
    ]),
    lesson("demo-words", "Science words", ["Complete scientific statements"], [
      "fill_blank",
      "word_bank",
      "spot_error",
    ]),
    lesson("demo-links", "Making links", ["Connect and organise ideas"], [
      "match_pairs",
      "ordering",
      "categorize",
    ]),
  ];
  const u2 = [
    lesson("demo-numbers", "Numbers & equations", ["Calculate and balance"], ["numeric", "equation_balance"]),
    lesson("demo-graphs", "Graphs", ["Read and plot data"], ["graph_read", "graph_plot"]),
    lesson("demo-experiments", "Experiments", ["Explore models and scenarios"], ["simulation", "dialogue"]),
  ];

  const units = [
    unit("demo-unit-1", "Tour of the lab", "Meet every kind of question.", "#6c5ce7", u1),
    unit("demo-unit-2", "Science tools", "Numbers, graphs and experiments.", "#1cb0f6", u2),
  ].filter((u) => u.lessons.length > 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    id: "demo",
    title: "Scientifically Demo",
    subject: "General science",
    level: "Everyone",
    description: "A sampler of every question type. Replace with AI-generated packs.",
    units,
  };
}
