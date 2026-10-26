import type { ExerciseCore } from "@/content/types";
import { autoCheckSimulation, gradeSimulation } from "./grade";
import { simulationResponseSchema, simulationSchema, type Simulation, type SimulationResponse } from "./schema";

export const simulation: ExerciseCore<Simulation, SimulationResponse> = {
  type: "simulation",
  label: "Simulation",
  schema: simulationSchema,
  responseSchema: simulationResponseSchema,
  grade: gradeSimulation,
  autoCheck: autoCheckSimulation,
  promptNotes:
    "Pick a model from the simulation list and give the learner 1–2 sliders (`adjustable`) and a concrete goal on one output, with a tolerance of about 2–5% of the target; the learner sees the live output, so the explanation should give the reasoning or equation that predicts the setting. The goal must be reachable within the slider ranges and must NOT already be met by the starting values (model defaults, or a value you put in `fixed` for an adjustable param). Lock everything else that matters in `fixed` (e.g. g = 1.6 for the Moon).",
  examples: [
    {
      id: "sim-projectile-flag",
      type: "simulation",
      prompt: "Launch the ball so it lands on the flag **50 m** away.",
      modelId: "projectile",
      fixed: { g: 9.8 },
      adjustable: ["angle", "v0"],
      goal: { output: "range", target: 50, tolerance: 2 },
      explanation:
        "Range = v_{0}^{2} × sin(2θ) ÷ g. For any speed, **45°** gives the longest range, so at 45° you need v_{0}^{2} ≈ 50 × 9.8 ≈ 490, about **22 m/s**. A faster launch also works with a flatter or steeper angle: 30° and 60° give the same range.",
      hint: "Try 45° first: it sends the ball furthest for a given speed.",
      skillTags: ["motion.projectiles"],
      difficulty: 3,
      characterId: "lumi",
    },
    {
      id: "sim-ohms-current",
      type: "simulation",
      prompt: "This bulb has a resistance of 20 Ω and needs a current of **0.45 A**. Set the battery voltage.",
      modelId: "ohms_law",
      fixed: { resistance: 20 },
      adjustable: ["voltage"],
      goal: { output: "current", target: 0.45, tolerance: 0.015 },
      explanation:
        "Rearrange Ohm's law: V = I × R = 0.45 A × 20 Ω = **9 V**. With the resistance fixed, the current rises in proportion to the voltage.",
      skillTags: ["electricity.ohms-law"],
      difficulty: 2,
      characterId: "volt",
    },
    {
      id: "sim-boyle-squeeze",
      type: "simulation",
      prompt: "Squeeze the gas until its pressure reaches **250 kPa**. The temperature stays at 300 K.",
      modelId: "ideal_gas",
      fixed: { moles: 1, temperature: 300 },
      adjustable: ["volume"],
      goal: { output: "pressure", target: 250, tolerance: 5 },
      explanation:
        "Boyle's law: at constant temperature, pressure × volume stays the same. It starts at about 100 kPa in 25 L, so 2.5× the pressure needs 25 ÷ 2.5 = **10 L**. Squashed closer together, the particles hit the walls more often.",
      skillTags: ["gases.boyles-law"],
      difficulty: 3,
      characterId: "bond",
    },
  ],
};
