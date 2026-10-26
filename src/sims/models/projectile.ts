import type { SimModel } from "../types";

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Projectile launched from ground level, no air resistance. */
export const projectile: SimModel = {
  id: "projectile",
  title: "Projectile launcher",
  description:
    "A ball launched from flat ground with no air resistance. Good goals: hit a target range (try a fixed angle and adjustable speed, or both adjustable), reach a max height, or stay in the air for a set time; fix g to explore the Moon (1.6) or Mars (3.7).",
  params: [
    { name: "v0", label: "Launch speed", unit: "m/s", min: 1, max: 40, step: 1, default: 15 },
    { name: "angle", label: "Launch angle", unit: "°", min: 5, max: 85, step: 1, default: 30 },
    { name: "g", label: "Gravity", unit: "m/s^{2}", min: 1, max: 25, step: 0.1, default: 9.8 },
  ],
  outputs: [
    { name: "range", label: "Range", unit: "m" },
    { name: "maxHeight", label: "Max height", unit: "m" },
    { name: "flightTime", label: "Flight time", unit: "s" },
  ],
  run({ v0, angle, g }) {
    const a = rad(angle);
    return {
      range: (v0 * v0 * Math.sin(2 * a)) / g,
      maxHeight: (v0 * v0 * Math.sin(a) ** 2) / (2 * g),
      flightTime: (2 * v0 * Math.sin(a)) / g,
    };
  },
};
