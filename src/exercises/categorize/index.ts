import type { ExerciseCore } from "@/content/types";
import { autoCheckCategorize, gradeCategorize } from "./grade";
import { categorizeResponseSchema, categorizeSchema, type Categorize, type CategorizeResponse } from "./schema";

export const categorize: ExerciseCore<Categorize, CategorizeResponse> = {
  type: "categorize",
  label: "Sort into groups",
  schema: categorizeSchema,
  responseSchema: categorizeResponseSchema,
  grade: gradeCategorize,
  autoCheck: autoCheckCategorize,
  promptNotes:
    "Use 2–4 categories with short labels and 6–9 items, at least two per category; every item must belong to exactly one category without debate. Keep item texts short (a word or short phrase, under 40 characters) and include one or two items that target a common misconception (a whale among the mammals).",
  examples: [
    {
      id: "cat-vertebrate-classes",
      type: "categorize",
      prompt: "Sort these animals into their vertebrate groups.",
      categories: [
        { id: "mammals", label: "Mammals" },
        { id: "birds", label: "Birds" },
        { id: "reptiles", label: "Reptiles" },
        { id: "amphibians", label: "Amphibians" },
      ],
      items: [
        { text: "Whale", categoryId: "mammals" },
        { text: "Bat", categoryId: "mammals" },
        { text: "Penguin", categoryId: "birds" },
        { text: "Ostrich", categoryId: "birds" },
        { text: "Crocodile", categoryId: "reptiles" },
        { text: "Tortoise", categoryId: "reptiles" },
        { text: "Frog", categoryId: "amphibians" },
        { text: "Salamander", categoryId: "amphibians" },
      ],
      explanation:
        "Whales and bats breathe air, have hair and feed their young milk, so they are **mammals**. Penguins and ostriches can't fly but have feathers, so they are **birds**. Salamanders look like lizards, but their moist skin and jelly-coated eggs make them **amphibians**.",
      skillTags: ["biology.classification"],
      difficulty: 2,
      characterId: "pip",
    },
    {
      id: "cat-states-room-temp",
      type: "categorize",
      prompt: "Sort these substances by their state at room temperature (about 20 °C).",
      categories: [
        { id: "solid", label: "Solid" },
        { id: "liquid", label: "Liquid" },
        { id: "gas", label: "Gas" },
      ],
      items: [
        { text: "Iron (Fe)", categoryId: "solid" },
        { text: "Iodine (I_{2})", categoryId: "solid" },
        { text: "Table salt (NaCl)", categoryId: "solid" },
        { text: "Mercury (Hg)", categoryId: "liquid" },
        { text: "Bromine (Br_{2})", categoryId: "liquid" },
        { text: "Water (H_{2}O)", categoryId: "liquid" },
        { text: "Oxygen (O_{2})", categoryId: "gas" },
        { text: "Carbon dioxide (CO_{2})", categoryId: "gas" },
        { text: "Neon (Ne)", categoryId: "gas" },
      ],
      explanation:
        "**Mercury** and **bromine** are the only elements that are liquid at room temperature. Iodine stays solid until 114 °C, while O_{2}, CO_{2} and neon only condense far below 0 °C.",
      hint: "Only two elements are liquids at room temperature.",
      skillTags: ["matter.states"],
      difficulty: 3,
      characterId: "bond",
    },
    {
      id: "cat-energy-resources",
      type: "categorize",
      prompt: "Which energy resources are renewable?",
      categories: [
        { id: "renewable", label: "Renewable" },
        { id: "non-renewable", label: "Non-renewable" },
      ],
      items: [
        { text: "Solar", categoryId: "renewable" },
        { text: "Coal", categoryId: "non-renewable" },
        { text: "Wind", categoryId: "renewable" },
        { text: "Natural gas", categoryId: "non-renewable" },
        { text: "Geothermal", categoryId: "renewable" },
        { text: "Crude oil", categoryId: "non-renewable" },
        { text: "Hydroelectric", categoryId: "renewable" },
        { text: "Uranium (nuclear)", categoryId: "non-renewable" },
      ],
      explanation:
        "**Renewable** resources are replenished naturally as we use them: sunlight, wind, Earth's internal heat and the water cycle. Fossil fuels took millions of years to form, and uranium is mined from a **finite** supply of ore.",
      skillTags: ["energy.resources"],
      difficulty: 1,
      characterId: "volt",
    },
  ],
};
