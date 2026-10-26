import { z } from "zod";
import { exerciseBaseSchema } from "@/content/schema/exercise-base";

export const toleranceSchema = z
  .object({
    abs: z.number().min(0).optional().describe("Absolute tolerance, in the answer's unit"),
    rel: z
      .number()
      .min(0)
      .max(0.5)
      .optional()
      .describe("Relative tolerance as a fraction, e.g. 0.02 = ±2%"),
  })
  .refine((t) => t.abs !== undefined || t.rel !== undefined, "give abs and/or rel tolerance");

export const numericSchema = exerciseBaseSchema
  .extend({
    type: z.literal("numeric"),
    answer: z.number(),
    tolerance: toleranceSchema,
    unit: z.string().max(16).optional().describe("Unit of the answer, e.g. 'm/s^{2}' or 'mol'"),
    unitChoices: z
      .array(z.string().max(16))
      .max(4)
      .optional()
      .describe(
        "If given, the learner must also pick the unit from a menu of `unit` + these wrong units. If absent, `unit` is just shown after the input.",
      ),
    computation: z
      .object({
        expr: z
          .string()
          .max(500)
          .describe(
            "Arithmetic that computes the answer from vars, e.g. 'm * a' or '2 * pi * sqrt(L / g)'. Allowed: numbers (1e-3), + - * / ^, parentheses, var names, pi, e, sqrt, abs, sin, cos, tan (radians), log10, ln, exp, min, max. Always write * explicitly.",
          ),
        vars: z.record(z.string(), z.number()),
      })
      .optional()
      .describe("Strongly recommended: lets us verify the answer automatically."),
  })
  .refine((ex) => !ex.unitChoices || ex.unit !== undefined, {
    message: "unitChoices requires unit",
    path: ["unitChoices"],
  });

export type Numeric = z.infer<typeof numericSchema>;

export const numericResponseSchema = z.object({
  value: z.number(),
  unit: z.string().optional(),
});
export type NumericResponse = z.infer<typeof numericResponseSchema>;
