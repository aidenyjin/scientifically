import type { SimModel } from "../types";

/** Molar gas constant, J/(mol·K). */
export const GAS_CONSTANT = 8.314;

/** Ideal gas in a piston. P = nRT/V; with V in litres, nRT/V comes out in kPa. */
export const idealGas: SimModel = {
  id: "ideal_gas",
  title: "Gas in a piston",
  description:
    "An ideal gas in a cylinder with a piston; P = nRT/V (pressure in kPa, volume in litres). Good goals: reach a target pressure by heating (temperature adjustable, volume fixed — Gay-Lussac), by compressing (volume adjustable — Boyle), or by adding gas (moles).",
  params: [
    { name: "moles", label: "Amount of gas", unit: "mol", min: 0.1, max: 5, step: 0.1, default: 1 },
    { name: "temperature", label: "Temperature", unit: "K", min: 100, max: 600, step: 10, default: 300 },
    { name: "volume", label: "Volume", unit: "L", min: 1, max: 50, step: 1, default: 25 },
  ],
  outputs: [{ name: "pressure", label: "Pressure", unit: "kPa" }],
  run({ moles, temperature, volume }) {
    return { pressure: (moles * GAS_CONSTANT * temperature) / volume };
  },
};
