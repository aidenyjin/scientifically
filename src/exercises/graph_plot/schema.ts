import { z } from "zod";
import { exerciseBaseSchema } from "@/content/schema/exercise-base";

const point = z.tuple([z.number(), z.number()]);

export const graphPlotSchema = exerciseBaseSchema
  .extend({
    type: z.literal("graph_plot"),
    axes: z.object({
      xLabel: z.string().max(40),
      yLabel: z.string().max(40),
      xMin: z.number(),
      xMax: z.number(),
      yMin: z.number(),
      yMax: z.number(),
      xStep: z.number().positive().describe("Grid spacing; placed points snap to it"),
      yStep: z.number().positive(),
    }),
    points: z.array(point).min(1).max(10).describe("The points the learner must plot"),
    tolerance: z.number().min(0).describe("How far (in axis units) a placed point may be from the target"),
    connect: z.boolean().optional().describe("Draw a line through placed points in x order"),
  })
  .refine((ex) => ex.axes.xMin < ex.axes.xMax && ex.axes.yMin < ex.axes.yMax, {
    message: "axes need min < max",
    path: ["axes"],
  })
  .refine(
    (ex) =>
      ex.points.every(
        ([x, y]) => x >= ex.axes.xMin && x <= ex.axes.xMax && y >= ex.axes.yMin && y <= ex.axes.yMax,
      ),
    { message: "all points must lie inside the axes", path: ["points"] },
  );

export type GraphPlot = z.infer<typeof graphPlotSchema>;

export const graphPlotResponseSchema = z.object({ points: z.array(point) });
export type GraphPlotResponse = z.infer<typeof graphPlotResponseSchema>;
