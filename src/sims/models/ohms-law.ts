import type { SimModel } from "../types";

/** A battery driving current through one resistor (a bulb shows the power). */
export const ohmsLaw: SimModel = {
  id: "ohms_law",
  title: "Simple circuit",
  description:
    "A battery and a resistor in series; I = V/R and P = V²/R. Good goals: set the voltage to get a target current with a fixed resistance, pick a resistance for a target current, or reach a target power.",
  params: [
    { name: "voltage", label: "Voltage", unit: "V", min: 0.5, max: 24, step: 0.5, default: 6 },
    { name: "resistance", label: "Resistance", unit: "Ω", min: 1, max: 100, step: 1, default: 10 },
  ],
  outputs: [
    { name: "current", label: "Current", unit: "A" },
    { name: "power", label: "Power", unit: "W" },
  ],
  run({ voltage, resistance }) {
    return { current: voltage / resistance, power: (voltage * voltage) / resistance };
  },
};
