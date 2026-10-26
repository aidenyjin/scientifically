import type { SimModel } from "../types";
import { hookesLaw } from "./hookes-law";
import { idealGas } from "./ideal-gas";
import { ohmsLaw } from "./ohms-law";
import { pendulum } from "./pendulum";
import { projectile } from "./projectile";
import { waveSpeed } from "./wave-speed";

/** All simulation models (pure, server-safe). Visuals live in src/sims/visuals. */
export const SIM_MODELS: SimModel[] = [projectile, ohmsLaw, idealGas, pendulum, hookesLaw, waveSpeed];

export function getSimModel(id: string): SimModel | undefined {
  return SIM_MODELS.find((m) => m.id === id);
}

/** Merge defaults, fixed and chosen params for a run. */
export function resolveParams(
  model: SimModel,
  fixed: Record<string, number>,
  chosen: Record<string, number> = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of model.params) out[p.name] = chosen[p.name] ?? fixed[p.name] ?? p.default;
  return out;
}
