import type { SimModel } from "../types";

/** The wave equation: v = fλ. */
export const waveSpeed: SimModel = {
  id: "wave_speed",
  title: "Wave machine",
  description:
    "A travelling wave; speed v = fλ. Good goals: set the frequency to make a wave of fixed wavelength travel at a target speed, or set the wavelength for a target speed at a fixed frequency.",
  params: [
    { name: "frequency", label: "Frequency", unit: "Hz", min: 0.5, max: 20, step: 0.5, default: 2 },
    { name: "wavelength", label: "Wavelength", unit: "m", min: 0.1, max: 5, step: 0.1, default: 1 },
  ],
  outputs: [{ name: "speed", label: "Wave speed", unit: "m/s" }],
  run({ frequency, wavelength }) {
    return { speed: frequency * wavelength };
  },
};
