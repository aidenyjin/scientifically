import type { SimModel } from "../types";

/** A mass hanging from a spring at rest: F = mg, extension = F/k. */
export const hookesLaw: SimModel = {
  id: "hookes_law",
  title: "Spring and mass",
  description:
    "A mass hanging at rest from a spring; force F = mg and extension x = F/k (Hooke's law, extension in metres). Good goals: pick a mass for a target extension, or choose a spring constant so a given mass stretches it by a target amount.",
  params: [
    { name: "springConstant", label: "Spring constant", unit: "N/m", min: 10, max: 200, step: 5, default: 50 },
    { name: "mass", label: "Mass", unit: "kg", min: 0.1, max: 2, step: 0.1, default: 0.5 },
    { name: "g", label: "Gravity", unit: "m/s^{2}", min: 1, max: 25, step: 0.1, default: 9.8 },
  ],
  outputs: [
    { name: "force", label: "Weight", unit: "N" },
    { name: "extension", label: "Extension", unit: "m" },
  ],
  run({ springConstant, mass, g }) {
    const force = mass * g;
    return { force, extension: force / springConstant };
  },
};
