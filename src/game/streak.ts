import { addDays, daysBetween, localDateString } from "@/lib/clock";

/**
 * Streaks count local calendar days (YYYY-MM-DD in the user's time zone, from
 * `localDateString(now, user.timezone)`) with at least one completed lesson.
 * A missed day is covered by a streak freeze if one is owned (consumed
 * automatically); otherwise the streak is lost. Frozen days keep the streak
 * alive but do not add to it. Mirrors the Streak table.
 */
export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  /** Days covered by a freeze (sorted, unique). */
  frozenDates: string[];
}

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  frozenDates: [],
};

/** The user's local date for `now`. */
export function localDay(now: Date, timeZone: string): string {
  return localDateString(now, timeZone);
}

/** Days strictly between the last active day and `today` that are not already frozen. */
export function missedDays(state: StreakState, today: string): string[] {
  if (!state.lastActiveDate) return [];
  const gap = daysBetween(state.lastActiveDate, today);
  if (gap <= 1) return [];
  const frozen = new Set(state.frozenDates);
  const out: string[] = [];
  for (let i = 1; i < gap; i++) {
    const d = addDays(state.lastActiveDate, i);
    if (!frozen.has(d)) out.push(d);
  }
  return out;
}

export interface SettleResult {
  state: StreakState;
  /** Freezes consumed now (subtract from the wallet). */
  freezesUsed: number;
  /** The streak was alive and has just been lost. */
  lost: boolean;
}

/**
 * Resolve fully elapsed days before `today` without recording activity: covers
 * missed days with freezes, or zeroes the streak when there aren't enough.
 * Call it when the user opens the app so freezes are consumed for days that
 * have passed (a freeze bought afterwards can't rescue them). Idempotent.
 *
 * Freezes are only spent when they can cover every missed day; a streak that
 * can't be saved keeps its freezes.
 */
export function settleStreak(
  state: StreakState,
  today: string,
  freezesAvailable: number,
): SettleResult {
  const missed = missedDays(state, today);
  if (state.current <= 0 || missed.length === 0) return { state, freezesUsed: 0, lost: false };
  if (missed.length <= Math.max(0, freezesAvailable)) {
    return {
      state: { ...state, frozenDates: mergeDates(state.frozenDates, missed) },
      freezesUsed: missed.length,
      lost: false,
    };
  }
  return { state: { ...state, current: 0 }, freezesUsed: 0, lost: true };
}

export interface ActivityResult {
  state: StreakState;
  /** Today is newly counted (first lesson of the day): animate the flame. */
  extended: boolean;
  /** Freezes consumed to bridge missed days (subtract from the wallet). */
  freezesUsed: number;
  /** A previous streak was broken and this lesson started a new one at 1. */
  reset: boolean;
}

/** Record a completed lesson on local date `today`. */
export function applyActivity(
  state: StreakState,
  today: string,
  freezesAvailable: number,
): ActivityResult {
  if (state.lastActiveDate === null) {
    const current = 1;
    return {
      state: {
        ...state,
        current,
        longest: Math.max(state.longest, current),
        lastActiveDate: today,
      },
      extended: true,
      freezesUsed: 0,
      reset: false,
    };
  }
  // Same day, or an earlier day after the user moved west across time zones: already counted.
  if (daysBetween(state.lastActiveDate, today) <= 0) {
    return { state, extended: false, freezesUsed: 0, reset: false };
  }
  const settled = settleStreak(state, today, freezesAvailable);
  const continued = settled.state.current > 0;
  const current = continued ? settled.state.current + 1 : 1;
  return {
    state: {
      ...settled.state,
      current,
      longest: Math.max(settled.state.longest, current),
      lastActiveDate: today,
    },
    extended: true,
    freezesUsed: settled.freezesUsed,
    reset: !continued,
  };
}

export interface StreakStatus {
  /** Streak to display: 0 if it has been lost. */
  current: number;
  activeToday: boolean;
  /** Alive but today isn't done yet. */
  atRisk: boolean;
  /** There was a streak and it can no longer be saved. */
  lost: boolean;
  /** Freezes that will be consumed to bridge missed days (0 if none or lost). */
  freezesNeeded: number;
}

/** Read-only status for display (does not consume freezes). */
export function streakStatus(
  state: StreakState,
  today: string,
  freezesAvailable: number,
): StreakStatus {
  if (state.lastActiveDate === null || state.current <= 0) {
    const activeToday =
      state.lastActiveDate !== null && daysBetween(state.lastActiveDate, today) <= 0;
    return { current: 0, activeToday, atRisk: false, lost: false, freezesNeeded: 0 };
  }
  if (daysBetween(state.lastActiveDate, today) <= 0) {
    return {
      current: state.current,
      activeToday: true,
      atRisk: false,
      lost: false,
      freezesNeeded: 0,
    };
  }
  const needed = missedDays(state, today).length;
  if (needed > Math.max(0, freezesAvailable)) {
    return { current: 0, activeToday: false, atRisk: false, lost: true, freezesNeeded: 0 };
  }
  return {
    current: state.current,
    activeToday: false,
    atRisk: true,
    lost: false,
    freezesNeeded: needed,
  };
}

export interface CalendarDay {
  date: string;
  /** Day of month, 1–31. */
  day: number;
  /** 0 = Monday … 6 = Sunday (for laying out a Mon-first grid). */
  weekday: number;
  active: boolean;
  /** Covered by a streak freeze (never true on an active day). */
  frozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Every day of the month containing `monthStart` ("YYYY-MM" or any "YYYY-MM-DD"
 * in that month). `activeDates` are local dates with a completed lesson, e.g.
 * from `activeDatesFrom(xpEvents.map(e => e.at), timezone)`.
 */
export function calendar(
  state: StreakState,
  monthStart: string,
  activeDates: readonly string[],
  today?: string,
): CalendarDay[] {
  const [y, m] = monthStart.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error(`Invalid month: ${monthStart}`);
  }
  const active = new Set(activeDates);
  if (state.lastActiveDate) active.add(state.lastActiveDate);
  const frozen = new Set(state.frozenDates);
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: CalendarDay[] = [];
  for (let day = 1; day <= length; day++) {
    const date = `${y}-${pad2(m)}-${pad2(day)}`;
    const isActive = active.has(date);
    days.push({
      date,
      day,
      weekday: (new Date(Date.UTC(y, m - 1, day)).getUTCDay() + 6) % 7,
      active: isActive,
      frozen: !isActive && frozen.has(date),
      isToday: today === date,
      isFuture: today !== undefined && daysBetween(today, date) > 0,
    });
  }
  return days;
}

/** Unique, sorted local dates for a list of instants (e.g. XpEvent.at). */
export function activeDatesFrom(instants: readonly Date[], timeZone: string): string[] {
  return [...new Set(instants.map((d) => localDateString(d, timeZone)))].sort();
}

function mergeDates(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
