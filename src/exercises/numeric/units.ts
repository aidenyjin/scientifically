const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
};

/**
 * Canonical form of a unit for comparison: no spaces or multiplication dots,
 * lower case, and `^{2}`, `^2` and `²` all become `^2`.
 *   "m/s^{2}" → "m/s^2",  "m s⁻¹" → "ms^-1",  "kg·m/s" → "kgm/s"
 */
export function normalizeUnit(unit: string): string {
  return unit
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (run) => "^" + [...run].map((c) => SUPERSCRIPTS[c]).join(""))
    .replace(/\^\{([^}]*)\}/g, "^$1")
    .replace(/_\{([^}]*)\}/g, "$1")
    .replace(/[\s·⋅*]+/g, "")
    .replace(/−/g, "-")
    .toLowerCase();
}

export function unitsMatch(a: string, b: string): boolean {
  return normalizeUnit(a) === normalizeUnit(b);
}
