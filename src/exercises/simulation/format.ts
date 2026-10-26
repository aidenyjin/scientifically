import type { SimModel, SimOutput, SimParam } from "@/sims/types";
import { formatNumber } from "../_shared/numbers";

/** "50 m", "45°" — degree-style units hug the number. */
export function withUnit(value: string, unit: string): string {
  if (!unit) return value;
  return /^[°%′″]/.test(unit) ? `${value}${unit}` : `${value} ${unit}`;
}

/** Decimal places that resolve the tolerance (≤ 3): ±2 → 1 dp, ±0.1 → 2 dp. */
export function decimalsFor(tolerance: number): number {
  if (!(tolerance > 0)) return 2;
  return Math.min(3, Math.max(0, Math.ceil(-Math.log10(tolerance))) + 1);
}

export function formatOutputValue(value: number, tolerance: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return formatNumber(value, 3);
  return String(Number(value.toFixed(decimalsFor(tolerance))));
}

export function formatParamValue(p: SimParam, value: number): string {
  return withUnit(formatNumber(value), p.unit);
}

export function outputOf(model: SimModel, name: string): SimOutput | undefined {
  return model.outputs.find((o) => o.name === name);
}

/** "launch angle 34° and launch speed 23 m/s give a range of 50.1 m" */
export function describeSetting(
  model: SimModel,
  chosen: Record<string, number>,
  outputName: string,
  value: number,
  tolerance: number,
): string {
  const parts = model.params
    .filter((p) => chosen[p.name] !== undefined)
    .map((p) => `${p.label.toLowerCase()} ${formatParamValue(p, chosen[p.name])}`);
  const out = outputOf(model, outputName);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
  const verb = parts.length > 1 ? "give" : "gives";
  const noun = out ? out.label.toLowerCase() : "";
  const article = /^[aeiou]/.test(noun) ? "an" : "a";
  const sentence = `${list} ${verb} ${noun ? `${article} ${noun} of ` : ""}${withUnit(formatOutputValue(value, tolerance), out?.unit ?? "")}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
