"use client";

import type { ComponentType } from "react";
import { CircuitVisual } from "./CircuitVisual";
import { GasVisual } from "./GasVisual";
import { PendulumVisual } from "./PendulumVisual";
import { ProjectileVisual } from "./ProjectileVisual";
import { SpringVisual } from "./SpringVisual";
import { WaveVisual } from "./WaveVisual";
import type { SimVisualProps } from "./types";

export type { SimVisualProps } from "./types";

/** Client-only scenes, keyed by model id (see src/sims/models). */
export const SIM_VISUALS: Record<string, ComponentType<SimVisualProps>> = {
  projectile: ProjectileVisual,
  ohms_law: CircuitVisual,
  ideal_gas: GasVisual,
  pendulum: PendulumVisual,
  hookes_law: SpringVisual,
  wave_speed: WaveVisual,
};

export function getSimVisual(id: string): ComponentType<SimVisualProps> | undefined {
  return SIM_VISUALS[id];
}

/** Renders the scene for a model id (nothing for an unknown id). */
export function SimScene({ modelId, ...props }: SimVisualProps & { modelId: string }) {
  switch (modelId) {
    case "projectile":
      return <ProjectileVisual {...props} />;
    case "ohms_law":
      return <CircuitVisual {...props} />;
    case "ideal_gas":
      return <GasVisual {...props} />;
    case "pendulum":
      return <PendulumVisual {...props} />;
    case "hookes_law":
      return <SpringVisual {...props} />;
    case "wave_speed":
      return <WaveVisual {...props} />;
    default:
      return null;
  }
}
