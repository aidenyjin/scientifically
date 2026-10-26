import type { ExerciseCore } from "@/content/types";
import { autoCheckMatchPairs, gradeMatchPairs } from "./grade";
import { matchPairsResponseSchema, matchPairsSchema, type MatchPairs, type MatchPairsResponse } from "./schema";

export const matchPairs: ExerciseCore<MatchPairs, MatchPairsResponse> = {
  type: "match_pairs",
  label: "Match pairs",
  schema: matchPairsSchema,
  responseSchema: matchPairsResponseSchema,
  grade: gradeMatchPairs,
  autoCheck: autoCheckMatchPairs,
  promptNotes:
    "Use 4–6 pairs of one kind (term → definition, name → formula, quantity → unit), so every right tile is a plausible match for every left tile. Keep tiles short (under ~40 characters, never over 60) and make each pairing unambiguous. The prompt is a short instruction such as 'Match each organelle to its job'.",
  examples: [
    {
      id: "mp-organelle-jobs",
      type: "match_pairs",
      prompt: "Match each organelle to its job.",
      pairs: [
        { left: "Nucleus", right: "Holds the cell's DNA" },
        { left: "Mitochondrion", right: "Releases energy by respiration" },
        { left: "Ribosome", right: "Builds proteins" },
        { left: "Chloroplast", right: "Carries out photosynthesis" },
        { left: "Cell membrane", right: "Controls what enters and leaves" },
      ],
      explanation:
        "The **nucleus** stores DNA, **mitochondria** release energy from glucose, **ribosomes** assemble proteins, **chloroplasts** capture light to make glucose, and the **cell membrane** is selectively permeable.",
      skillTags: ["cells.organelles"],
      difficulty: 2,
      characterId: "pip",
    },
    {
      id: "mp-compound-formulas",
      type: "match_pairs",
      prompt: "Match each compound to its chemical formula.",
      pairs: [
        { left: "Water", right: "H_{2}O" },
        { left: "Carbon dioxide", right: "CO_{2}" },
        { left: "Methane", right: "CH_{4}" },
        { left: "Ammonia", right: "NH_{3}" },
        { left: "Sodium chloride", right: "NaCl" },
        { left: "Sulfuric acid", right: "H_{2}SO_{4}" },
      ],
      explanation:
        "Subscripts count atoms: CH_{4} has one carbon and four hydrogens; NH_{3} has one nitrogen and three hydrogens. Sodium chloride is ionic, so NaCl is a 1:1 ratio of Na^{+} and Cl^{−} ions.",
      hint: "*Di*oxide means two oxygen atoms.",
      skillTags: ["chemistry.formulas"],
      difficulty: 3,
      characterId: "bond",
    },
    {
      id: "mp-si-units",
      type: "match_pairs",
      prompt: "Match each quantity to its SI unit.",
      pairs: [
        { left: "Force", right: "newton (N)" },
        { left: "Energy", right: "joule (J)" },
        { left: "Power", right: "watt (W)" },
        { left: "Pressure", right: "pascal (Pa)" },
        { left: "Frequency", right: "hertz (Hz)" },
      ],
      explanation:
        "1 N = 1 kg·m/s^{2}; 1 J = 1 N·m; 1 W = 1 J/s; 1 Pa = 1 N/m^{2}; 1 Hz = one cycle per second.",
      skillTags: ["physics.units"],
      difficulty: 2,
    },
  ],
};
