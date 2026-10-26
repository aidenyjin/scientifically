import { z } from "zod";
import { exerciseBaseSchema } from "@/content/schema/exercise-base";

export const simulationSchema = exerciseBaseSchema.extend({
  type: z.literal("simulation"),
  modelId: z.string().describe("One of the simulation model ids listed in the prompt"),
  fixed: z
    .record(z.string(), z.number())
    .describe("Params locked to a value for this exercise (others use the model default)"),
  adjustable: z.array(z.string()).min(1).max(3).describe("Param names the learner controls with sliders"),
  goal: z.object({
    output: z.string().describe("Model output name to hit"),
    target: z.number(),
    tolerance: z.number().positive(),
  }),
});

export type Simulation = z.infer<typeof simulationSchema>;

export const simulationResponseSchema = z.object({ params: z.record(z.string(), z.number()) });
export type SimulationResponse = z.infer<typeof simulationResponseSchema>;
