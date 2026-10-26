/**
 * The only source of "now" for app logic. Pure modules take a `now: Date`
 * argument; callers get it from here, and tests override it.
 */
let override: Date | null = null;

export function now(): Date {
  return override ? new Date(override) : new Date();
}

/** Test helper. Pass null to go back to the real clock. */
export function setNow(date: Date | null): void {
  override = date ? new Date(date) : null;
}

/** YYYY-MM-DD for `date` as seen in `timeZone` (IANA name, e.g. "Europe/London"). */
export function localDateString(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Whole days from date string a to date string b (YYYY-MM-DD), e.g. ("2026-01-01","2026-01-03") → 2. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Add days to a YYYY-MM-DD string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}
