import { z } from "zod";
import { exerciseBaseSchema, richText } from "@/content/schema/exercise-base";
import { toleranceSchema } from "../numeric/schema";

const point = z.tuple([z.number(), z.number()]);

export const chartSchema = z.object({
  kind: z.enum(["line", "bar", "scatter"]),
  title: z.string().max(60).optional(),
  xLabel: z.string().max(40),
  yLabel: z.string().max(40),
  xCategories: z
    .array(z.string())
    .optional()
    .describe("Bar charts only: label for each x index (x values are 0,1,2…)"),
  series: z.array(z.object({ name: z.string().max(30), points: z.array(point).min(2).max(40) })).min(1).max(4),
});

export const graphReadSchema = exerciseBaseSchema
  .extend({
    type: z.literal("graph_read"),
    chart: chartSchema,
    question: z.discriminatedUnion("mode", [
      z.object({
        mode: z.literal("choice"),
        options: z.array(richText()).min(2).max(5).describe("Answer options. Shuffled when shown."),
        answerIndex: z.number().int().min(0).describe("Index into options of the single correct answer"),
      }),
      z.object({
        mode: z.literal("numeric"),
        answer: z.number().describe("A value read directly off the chart"),
        tolerance: toleranceSchema,
        unit: z.string().max(16).optional(),
      }),
    ]),
  })
  .refine((ex) => ex.question.mode !== "choice" || ex.question.answerIndex < ex.question.options.length, {
    message: "answerIndex must point at an option",
    path: ["question", "answerIndex"],
  });

export type GraphRead = z.infer<typeof graphReadSchema>;

export const graphReadResponseSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("choice"), index: z.number().int().min(0) }),
  z.object({ mode: z.literal("numeric"), value: z.number() }),
]);
export type GraphReadResponse = z.infer<typeof graphReadResponseSchema>;
