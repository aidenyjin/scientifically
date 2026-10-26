import type { SimModel } from "../types";

/** Simple pendulum, small swings: T = 2π√(L/g). */
export const pendulum: SimModel = {
  id: "pendulum",
  title: "Pendulum",
  description:
    "A simple pendulum making small swings; period T = 2π√(L/g), independent of mass. Good goals: choose a length for a target period (e.g. a 2 s 'seconds pendulum' is about 1 m), or find the period on another planet by fixing g.",
  params: [
    { name: "length", label: "Length", unit: "m", min: 0.1, max: 3, step: 0.05, default: 0.5 },
    { name: "g", label: "Gravity", unit: "m/s^{2}", min: 1, max: 25, step: 0.1, default: 9.8 },
  ],
  outputs: [
    { name: "period", label: "Period", unit: "s" },
    { name: "frequency", label: "Frequency", unit: "Hz" },
  ],
  run({ length, g }) {
    const period = 2 * Math.PI * Math.sqrt(length / g);
    return { period, frequency: 1 / period };
  },
};
