import type { ExerciseCore } from "@/content/types";
import { autoCheckOrdering, gradeOrdering } from "./grade";
import { orderingResponseSchema, orderingSchema, type Ordering, type OrderingResponse } from "./schema";

export const ordering: ExerciseCore<Ordering, OrderingResponse> = {
  type: "ordering",
  label: "Put in order",
  schema: orderingSchema,
  responseSchema: orderingResponseSchema,
  grade: gradeOrdering,
  autoCheck: autoCheckOrdering,
  promptNotes:
    "List `items` in the CORRECT order (the app shuffles them). Use 4–6 items with one unambiguous ordering — a sequence of stages, or a ranking by a single measurable property — and say what the order is in the prompt. Set `startLabel`/`endLabel` (e.g. 'Shortest wavelength' / 'Longest wavelength') when the direction could be unclear.",
  examples: [
    {
      id: "ord-mitosis-phases",
      type: "ordering",
      prompt: "Put the phases of mitosis in order.",
      items: [
        "**Prophase**: chromosomes condense",
        "**Metaphase**: chromosomes line up in the middle",
        "**Anaphase**: sister chromatids are pulled apart",
        "**Telophase**: two new nuclei form",
      ],
      startLabel: "First",
      endLabel: "Last",
      explanation:
        "Remember **PMAT**: chromosomes condense (prophase), line up at the equator (metaphase), separate to opposite poles (anaphase), then new nuclear envelopes form (telophase) before the cytoplasm divides.",
      hint: "Chromosomes must line up before they can be pulled apart.",
      skillTags: ["cells.mitosis"],
      difficulty: 2,
      characterId: "pip",
    },
    {
      id: "ord-em-spectrum",
      type: "ordering",
      prompt: "Order these electromagnetic waves from shortest to longest wavelength.",
      items: ["Gamma rays", "X-rays", "Ultraviolet", "Visible light", "Infrared", "Microwaves", "Radio waves"],
      startLabel: "Shortest wavelength",
      endLabel: "Longest wavelength",
      explanation:
        "Gamma rays have wavelengths below about 10^{−11} m; radio waves can be kilometres long. Shorter wavelength means higher frequency and more energy per photon, which is why gamma, X-rays and UV are ionising.",
      skillTags: ["waves.electromagnetic-spectrum"],
      difficulty: 3,
    },
    {
      id: "ord-earth-layers",
      type: "ordering",
      prompt: "Order Earth's layers from the surface to the centre.",
      items: ["Crust", "Mantle", "Outer core", "Inner core"],
      startLabel: "Surface",
      endLabel: "Centre",
      explanation:
        "The thin rocky **crust** sits on the hot, slowly flowing **mantle**. Below that is the **liquid** iron–nickel outer core, and at the centre the inner core is kept **solid** by enormous pressure.",
      skillTags: ["earth.structure"],
      difficulty: 1,
      characterId: "terra",
    },
  ],
};
