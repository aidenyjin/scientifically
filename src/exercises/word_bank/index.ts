import type { ExerciseCore } from "@/content/types";
import { autoCheckWordBank, gradeWordBank } from "./grade";
import { wordBankResponseSchema, wordBankSchema, type WordBank, type WordBankResponse } from "./schema";

export const wordBank: ExerciseCore<WordBank, WordBankResponse> = {
  type: "word_bank",
  label: "Word bank",
  schema: wordBankSchema,
  responseSchema: wordBankResponseSchema,
  grade: gradeWordBank,
  autoCheck: autoCheckWordBank,
  promptNotes:
    "Use 1–3 blanks whose answers cannot be swapped (grading is by position), plus 2–4 distractors from the same topic that fit the grammar but are clearly wrong — at most 9 tiles in total. Keep tiles to 1–2 words and avoid articles before blanks ('a'/'an') that give the answer away.",
  examples: [
    {
      id: "wb-water-cycle",
      type: "word_bank",
      prompt: "Complete the water cycle.",
      text: "Water ___ from the ocean, ___ into clouds, and falls back to the ground as ___.",
      answers: ["evaporates", "condenses", "precipitation"],
      distractors: ["melts", "freezes", "transpiration"],
      explanation:
        "The Sun heats the ocean so water **evaporates** into vapour. Rising vapour cools and **condenses** into droplets that form clouds, which return water as **precipitation** (rain, snow, hail).",
      skillTags: ["earth.water-cycle"],
      difficulty: 1,
      characterId: "terra",
    },
    {
      id: "wb-ions",
      type: "word_bank",
      prompt: "Name the two kinds of ion.",
      text: "Positive ions such as Na^{+} are called ___, and negative ions such as Cl^{−} are called ___.",
      answers: ["cations", "anions"],
      distractors: ["isotopes", "isomers", "electrons"],
      explanation:
        "Atoms that **lose** electrons become positive **cations**; atoms that **gain** electrons become negative **anions**. In table salt, Na^{+} and Cl^{−} attract to form NaCl.",
      hint: "Cations are *pawsitive* — think of a cat.",
      skillTags: ["bonding.ions"],
      difficulty: 2,
      characterId: "bond",
    },
    {
      id: "wb-energy-stores",
      type: "word_bank",
      prompt: "Fill in the energy stores.",
      text: "Energy an object has because it is moving is called ___ energy, and a stretched spring stores ___ potential energy.",
      answers: ["kinetic", "elastic"],
      distractors: ["chemical", "gravitational", "nuclear"],
      explanation:
        "Anything moving has **kinetic** energy (½mv^{2}). A stretched or squashed spring stores **elastic** potential energy (½kx^{2}).",
      skillTags: ["energy.stores"],
      difficulty: 2,
      characterId: "volt",
    },
  ],
};
