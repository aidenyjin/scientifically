import { z } from "zod";
import { exerciseBaseSchema } from "@/content/schema/exercise-base";

const formula = z
  .string()
  .regex(/^[A-Za-z0-9()]+$/, "plain formula like Fe2(SO4)3 — no charges, states or hydrates");

export const equationBalanceSchema = exerciseBaseSchema
  .extend({
    type: z.literal("equation_balance"),
    reactants: z.array(formula).min(1).max(4),
    products: z.array(formula).min(1).max(4),
    answer: z
      .array(z.number().int().min(1).max(20))
      .describe("Smallest whole-number coefficients: reactants first, then products"),
  })
  .refine((ex) => ex.answer.length === ex.reactants.length + ex.products.length, {
    message: "answer needs one coefficient per reactant and product",
    path: ["answer"],
  });

export type EquationBalance = z.infer<typeof equationBalanceSchema>;

export const equationBalanceResponseSchema = z.object({
  coefficients: z.array(z.number().int().min(0)),
});
export type EquationBalanceResponse = z.infer<typeof equationBalanceResponseSchema>;
