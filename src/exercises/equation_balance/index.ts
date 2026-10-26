import type { ExerciseCore } from "@/content/types";
import { autoCheckEquationBalance, gradeEquationBalance } from "./grade";
import {
  equationBalanceResponseSchema,
  equationBalanceSchema,
  type EquationBalance,
  type EquationBalanceResponse,
} from "./schema";

export const equationBalance: ExerciseCore<EquationBalance, EquationBalanceResponse> = {
  type: "equation_balance",
  label: "Balance the equation",
  schema: equationBalanceSchema,
  responseSchema: equationBalanceResponseSchema,
  grade: gradeEquationBalance,
  autoCheck: autoCheckEquationBalance,
  promptNotes:
    "Use real reactions written as plain formulas (Fe2(SO4)3) with no charges, state symbols or hydrates, and never write coefficients inside a formula. `answer` is the smallest whole-number coefficients (1–20), reactants then products, and the equation must not already balance with all 1s. Difficulty 1–2 for 3–4 simple species; 3+ for polyatomic groups in parentheses or 5+ species.",
  examples: [
    {
      id: "eq-water-synthesis",
      type: "equation_balance",
      prompt: "Balance the equation for making water.",
      reactants: ["H2", "O2"],
      products: ["H2O"],
      answer: [2, 1, 2],
      explanation:
        "Oxygen comes in pairs (O_{2}), so you need **2 H_{2}O** to use both oxygen atoms. That's 4 hydrogen atoms, so you need **2 H_{2}**: 2H_{2} + O_{2} → 2H_{2}O.",
      hint: "Start with oxygen: one O_{2} has two O atoms, but one H_{2}O only uses one.",
      skillTags: ["reactions.balancing"],
      difficulty: 1,
      characterId: "bond",
    },
    {
      id: "eq-methane-combustion",
      type: "equation_balance",
      prompt: "Balance the combustion of methane.",
      reactants: ["CH4", "O2"],
      products: ["CO2", "H2O"],
      answer: [1, 2, 1, 2],
      explanation:
        "Carbon is already balanced. The 4 H atoms in CH_{4} make **2 H_{2}O**. Now there are 2 + 2 = 4 O atoms on the right, so you need **2 O_{2}**: CH_{4} + 2O_{2} → CO_{2} + 2H_{2}O.",
      hint: "Balance C, then H, and leave O (which appears on its own as O_{2}) until last.",
      skillTags: ["reactions.balancing", "reactions.combustion"],
      difficulty: 2,
    },
    {
      id: "eq-aluminium-sulfate",
      type: "equation_balance",
      prompt: "Balance this double-displacement reaction.",
      reactants: ["Al2(SO4)3", "Ca(OH)2"],
      products: ["Al(OH)3", "CaSO4"],
      answer: [1, 3, 2, 3],
      explanation:
        "Treat the groups as units. Al_{2}(SO_{4})_{3} gives 2 Al and 3 SO_{4}, so you need **2 Al(OH)_{3}** and **3 CaSO_{4}**. Those need 6 OH and 3 Ca, which **3 Ca(OH)_{2}** supplies.",
      hint: "Keep SO_{4} and OH together as groups instead of counting every O atom.",
      skillTags: ["reactions.balancing", "reactions.polyatomic-ions"],
      difficulty: 4,
      characterId: "bond",
    },
  ],
};
