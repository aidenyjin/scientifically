import type { ExerciseCore } from "@/content/types";
import { autoCheckSpotError, gradeSpotError } from "./grade";
import { spotErrorResponseSchema, spotErrorSchema, type SpotError, type SpotErrorResponse } from "./schema";

export const spotError: ExerciseCore<SpotError, SpotErrorResponse> = {
  type: "spot_error",
  label: "Spot the error",
  schema: spotErrorSchema,
  responseSchema: spotErrorResponseSchema,
  grade: gradeSpotError,
  autoCheck: autoCheckSpotError,
  promptNotes:
    "Write a short, flowing passage (3–6 segments that join with spaces into natural sentences) where exactly one segment contains a single, specific factual error based on a common misconception; every other segment must be unambiguously correct. `correction` is the fixed version of that whole segment, written so it reads in place of it.",
  examples: [
    {
      id: "se-photosynthesis-gas",
      type: "spot_error",
      prompt: "Find the mistake in this passage.",
      segments: [
        "Photosynthesis happens in the chloroplasts,",
        "where chlorophyll absorbs light energy.",
        "The leaf takes in oxygen through its stomata",
        "and combines it with water to make glucose,",
        "releasing oxygen as a by-product.",
      ],
      errorIndex: 2,
      correction: "The leaf takes in carbon dioxide (CO_{2}) through its stomata",
      explanation:
        "Plants take in **CO_{2}** for photosynthesis and give out O_{2}: 6CO_{2} + 6H_{2}O → C_{6}H_{12}O_{6} + 6O_{2}.",
      skillTags: ["plants.photosynthesis"],
      difficulty: 2,
      characterId: "pip",
    },
    {
      id: "se-voltmeter",
      type: "spot_error",
      prompt: "Which part of this method is wrong?",
      segments: [
        "Current is measured in amperes",
        "using an ammeter connected in series.",
        "Potential difference is measured in volts",
        "using a voltmeter connected in series",
        "across the component.",
      ],
      errorIndex: 3,
      correction: "using a voltmeter connected in parallel",
      explanation:
        "A voltmeter compares the energy per charge on either side of a component, so it must be connected **in parallel** across it. Ammeters go in series so all the current flows through them.",
      skillTags: ["electricity.measurement"],
      difficulty: 3,
      characterId: "volt",
    },
    {
      id: "se-moon-phases",
      type: "spot_error",
      prompt: "Spot the error.",
      segments: [
        "The Moon does not make its own light;",
        "we see it because it reflects sunlight.",
        "Its phases are caused by Earth's shadow falling on it",
        "as it orbits Earth about once a month.",
      ],
      errorIndex: 2,
      correction: "Its phases are caused by how much of its sunlit half we can see",
      explanation:
        "Half the Moon is always lit by the Sun. As it orbits, we see different amounts of that lit half. Earth's shadow only falls on the Moon during a **lunar eclipse**.",
      skillTags: ["space.moon-phases"],
      difficulty: 3,
      characterId: "nova",
    },
  ],
};
