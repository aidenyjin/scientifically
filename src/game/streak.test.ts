import { describe, expect, it } from "vitest";
import {
  activeDatesFrom,
  applyActivity,
  calendar,
  EMPTY_STREAK,
  localDay,
  missedDays,
  settleStreak,
  streakStatus,
  type StreakState,
} from "./streak";

const streak = (
  current: number,
  lastActiveDate: string | null,
  extra: Partial<StreakState> = {},
): StreakState => ({
  current,
  longest: Math.max(current, extra.longest ?? 0),
  lastActiveDate,
  frozenDates: [],
  ...extra,
});

/** Play lessons at these instants in `tz`, starting from an empty streak. */
function playAt(instants: string[], tz: string, freezes = 0) {
  let state = EMPTY_STREAK;
  let left = freezes;
  const results = instants.map((iso) => {
    const r = applyActivity(state, localDay(new Date(iso), tz), left);
    state = r.state;
    left -= r.freezesUsed;
    return r;
  });
  return { state, results, freezesLeft: left };
}

describe("applyActivity", () => {
  it("starts a streak on the first lesson ever", () => {
    expect(applyActivity(EMPTY_STREAK, "2026-10-26", 0)).toEqual({
      state: { current: 1, longest: 1, lastActiveDate: "2026-10-26", frozenDates: [] },
      extended: true,
      freezesUsed: 0,
      reset: false,
    });
  });

  it("does nothing for a second lesson the same day", () => {
    const s = streak(4, "2026-10-26");
    expect(applyActivity(s, "2026-10-26", 2)).toEqual({
      state: s,
      extended: false,
      freezesUsed: 0,
      reset: false,
    });
  });

  it("does nothing if the local date moves backwards (travelling west)", () => {
    const s = streak(4, "2026-10-26");
    expect(applyActivity(s, "2026-10-25", 0)).toEqual({
      state: s,
      extended: false,
      freezesUsed: 0,
      reset: false,
    });
  });

  // prettier-ignore
  it.each([
    // [label, current, last, today, freezes, → current, extended, freezesUsed, reset, frozenDates]
    ["next day", 4, "2026-10-25", "2026-10-26", 0, 5, true, 0, false, []],
    ["one missed day, no freeze", 4, "2026-10-24", "2026-10-26", 0, 1, true, 0, true, []],
    ["one missed day, one freeze", 4, "2026-10-24", "2026-10-26", 1, 5, true, 1, false, ["2026-10-25"]],
    ["one missed day, two freezes", 4, "2026-10-24", "2026-10-26", 2, 5, true, 1, false, ["2026-10-25"]],
    ["two missed days, two freezes", 4, "2026-10-23", "2026-10-26", 2, 5, true, 2, false, ["2026-10-24", "2026-10-25"]],
    // freezes are not wasted on a streak they can't save
    ["two missed days, one freeze", 4, "2026-10-23", "2026-10-26", 1, 1, true, 0, true, []],
    ["long break", 30, "2026-09-01", "2026-10-26", 2, 1, true, 0, true, []],
    ["month boundary", 9, "2026-01-31", "2026-02-01", 0, 10, true, 0, false, []],
    ["Feb → Mar (non-leap)", 9, "2026-02-28", "2026-03-01", 0, 10, true, 0, false, []],
    ["leap day", 9, "2028-02-28", "2028-02-29", 0, 10, true, 0, false, []],
    ["leap day missed, frozen", 9, "2028-02-28", "2028-03-01", 1, 10, true, 1, false, ["2028-02-29"]],
    ["year boundary", 9, "2026-12-31", "2027-01-01", 0, 10, true, 0, false, []],
    ["new year's day frozen", 9, "2026-12-31", "2027-01-02", 1, 10, true, 1, false, ["2027-01-01"]],
  ] as const)("%s", (_label, current, last, today, freezes, nextCurrent, extended, freezesUsed, reset, frozen) => {
    const r = applyActivity(streak(current, last), today, freezes);
    expect(r.state.current).toBe(nextCurrent);
    expect(r.state.lastActiveDate).toBe(today);
    expect(r.extended).toBe(extended);
    expect(r.freezesUsed).toBe(freezesUsed);
    expect(r.reset).toBe(reset);
    expect(r.state.frozenDates).toEqual(frozen);
  });

  it("tracks the longest streak and keeps it after a reset", () => {
    let s = streak(0, null);
    for (const d of ["2026-10-01", "2026-10-02", "2026-10-03"]) s = applyActivity(s, d, 0).state;
    expect(s).toMatchObject({ current: 3, longest: 3 });
    s = applyActivity(s, "2026-10-10", 0).state;
    expect(s).toMatchObject({ current: 1, longest: 3 });
    s = applyActivity(s, "2026-10-11", 0).state;
    expect(s).toMatchObject({ current: 2, longest: 3 });
  });

  it("restarts at 1 after the streak was already settled as lost", () => {
    const settled = settleStreak(streak(6, "2026-10-20"), "2026-10-26", 0);
    expect(settled.lost).toBe(true);
    const r = applyActivity(settled.state, "2026-10-26", 0);
    expect(r).toMatchObject({ extended: true, reset: true, freezesUsed: 0 });
    expect(r.state).toMatchObject({ current: 1, longest: 6 });
  });

  it("doesn't charge again for days already frozen by settleStreak", () => {
    const settled = settleStreak(streak(6, "2026-10-23"), "2026-10-25", 2);
    expect(settled.freezesUsed).toBe(1);
    // the next day, one more missed day needs a freeze; the 24th is already covered
    const r = applyActivity(settled.state, "2026-10-26", 1);
    expect(r.freezesUsed).toBe(1);
    expect(r.state.current).toBe(7);
    expect(r.state.frozenDates).toEqual(["2026-10-24", "2026-10-25"]);
  });
});

describe("time zones and DST", () => {
  it("two lessons minutes apart across local midnight count as two days", () => {
    // 23:59 and 00:01 Pacific (PDT, UTC-7)
    const { state } = playAt(
      ["2026-10-26T06:59:00Z", "2026-10-26T07:01:00Z"],
      "America/Los_Angeles",
    );
    expect(state).toMatchObject({ current: 2, lastActiveDate: "2026-10-26" });
    // …but the same two instants are one day in UTC
    expect(playAt(["2026-10-26T06:59:00Z", "2026-10-26T07:01:00Z"], "UTC").state.current).toBe(1);
  });

  it("uses the user's local date, not UTC", () => {
    // 23:30 UTC on the 10th is already the 11th in Tokyo, so 01:00Z on the 12th (10:00 JST) is the next day.
    const { state } = playAt(["2026-03-10T23:30:00Z", "2026-03-12T01:00:00Z"], "Asia/Tokyo");
    expect(state).toMatchObject({ current: 2, lastActiveDate: "2026-03-12" });
    // In UTC the 11th was skipped
    expect(playAt(["2026-03-10T23:30:00Z", "2026-03-12T01:00:00Z"], "UTC").state.current).toBe(1);
  });

  it("handles a half-hour offset zone (India, UTC+5:30)", () => {
    // 18:29Z = 23:59 IST; 18:31Z = 00:01 IST next day
    const { state } = playAt(["2026-06-01T18:29:00Z", "2026-06-01T18:31:00Z"], "Asia/Kolkata");
    expect(state.current).toBe(2);
  });

  it("spring forward: a 23-hour local day still counts once", () => {
    const tz = "America/New_York"; // DST starts 2026-03-08 02:00 local
    const { state, results } = playAt(
      [
        "2026-03-08T04:30:00Z", // Mar 7 23:30 EST
        "2026-03-09T03:30:00Z", // Mar 8 23:30 EDT (23 hours later)
        "2026-03-09T04:30:00Z", // Mar 9 00:30 EDT
      ],
      tz,
    );
    expect(results.map((r) => r.extended)).toEqual([true, true, true]);
    expect(state).toMatchObject({ current: 3, lastActiveDate: "2026-03-09" });
  });

  it("fall back: a 25-hour local day still counts once", () => {
    const tz = "America/New_York"; // DST ends 2026-11-01 02:00 local
    const { state, results } = playAt(
      [
        "2026-11-01T03:59:00Z", // Oct 31 23:59 EDT
        "2026-11-01T05:30:00Z", // Nov 1 01:30 EDT
        "2026-11-01T06:30:00Z", // Nov 1 01:30 EST (the repeated hour)
        "2026-11-02T04:59:00Z", // Nov 1 23:59 EST
        "2026-11-02T05:00:00Z", // Nov 2 00:00 EST
      ],
      tz,
    );
    expect(results.map((r) => r.extended)).toEqual([true, true, false, false, true]);
    expect(state).toMatchObject({ current: 3, lastActiveDate: "2026-11-02" });
  });

  it("Europe/London DST change (last Sunday of October)", () => {
    // BST ends 2026-10-25 02:00 local. 23:30 BST on the 24th = 22:30Z; 23:30 GMT on the 25th = 23:30Z.
    const { state } = playAt(["2026-10-24T22:30:00Z", "2026-10-25T23:30:00Z"], "Europe/London");
    expect(state).toMatchObject({ current: 2, lastActiveDate: "2026-10-25" });
  });

  it("a missed day across a DST change is still exactly one missed day", () => {
    const tz = "America/New_York";
    const { state, freezesLeft } = playAt(["2026-03-07T15:00:00Z", "2026-03-09T15:00:00Z"], tz, 1);
    expect(state).toMatchObject({ current: 2, frozenDates: ["2026-03-08"] });
    expect(freezesLeft).toBe(0);
  });
});

describe("settleStreak", () => {
  it("consumes freezes for elapsed missed days and is idempotent", () => {
    const s = streak(5, "2026-10-23");
    const first = settleStreak(s, "2026-10-26", 2);
    expect(first).toEqual({
      state: { ...s, frozenDates: ["2026-10-24", "2026-10-25"] },
      freezesUsed: 2,
      lost: false,
    });
    expect(settleStreak(first.state, "2026-10-26", 0)).toEqual({
      state: first.state,
      freezesUsed: 0,
      lost: false,
    });
  });

  it("doesn't touch today or yesterday", () => {
    for (const last of ["2026-10-26", "2026-10-25"]) {
      const s = streak(5, last);
      expect(settleStreak(s, "2026-10-26", 2)).toEqual({ state: s, freezesUsed: 0, lost: false });
    }
  });

  it("loses the streak (keeping freezes and longest) when freezes run short", () => {
    const r = settleStreak(streak(5, "2026-10-22", { longest: 9 }), "2026-10-26", 2);
    expect(r).toEqual({
      state: streak(0, "2026-10-22", { longest: 9 }),
      freezesUsed: 0,
      lost: true,
    });
    // already lost: nothing more happens
    expect(settleStreak(r.state, "2026-10-27", 2)).toMatchObject({ freezesUsed: 0, lost: false });
  });

  it("a freeze bought after the missed day was settled can't rescue it", () => {
    const lost = settleStreak(streak(5, "2026-10-24"), "2026-10-26", 0);
    expect(lost.lost).toBe(true);
    // user then buys a freeze and plays: the streak restarts
    expect(applyActivity(lost.state, "2026-10-26", 1)).toMatchObject({
      freezesUsed: 0,
      reset: true,
    });
  });

  it("ignores an empty streak", () => {
    expect(settleStreak(EMPTY_STREAK, "2026-10-26", 2)).toEqual({
      state: EMPTY_STREAK,
      freezesUsed: 0,
      lost: false,
    });
  });
});

describe("missedDays", () => {
  it("lists unfrozen days strictly between last active and today", () => {
    expect(missedDays(streak(3, "2026-12-29"), "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
    ]);
    expect(
      missedDays(streak(3, "2026-12-29", { frozenDates: ["2026-12-31"] }), "2027-01-02"),
    ).toEqual(["2026-12-30", "2027-01-01"]);
    expect(missedDays(streak(3, "2026-12-29"), "2026-12-30")).toEqual([]);
    expect(missedDays(EMPTY_STREAK, "2026-12-30")).toEqual([]);
  });
});

describe("streakStatus", () => {
  // prettier-ignore
  it.each([
    // [label, state, today, freezes, expected]
    ["never played", EMPTY_STREAK, "2026-10-26", 0, { current: 0, activeToday: false, atRisk: false, lost: false, freezesNeeded: 0 }],
    ["active today", streak(5, "2026-10-26"), "2026-10-26", 0, { current: 5, activeToday: true, atRisk: false, lost: false, freezesNeeded: 0 }],
    ["active yesterday", streak(5, "2026-10-25"), "2026-10-26", 0, { current: 5, activeToday: false, atRisk: true, lost: false, freezesNeeded: 0 }],
    ["missed yesterday, freeze owned", streak(5, "2026-10-24"), "2026-10-26", 1, { current: 5, activeToday: false, atRisk: true, lost: false, freezesNeeded: 1 }],
    ["missed yesterday, no freeze", streak(5, "2026-10-24"), "2026-10-26", 0, { current: 0, activeToday: false, atRisk: false, lost: true, freezesNeeded: 0 }],
    ["missed two days, one freeze", streak(5, "2026-10-23"), "2026-10-26", 1, { current: 0, activeToday: false, atRisk: false, lost: true, freezesNeeded: 0 }],
    ["missed days already frozen", streak(5, "2026-10-23", { frozenDates: ["2026-10-24", "2026-10-25"] }), "2026-10-26", 0, { current: 5, activeToday: false, atRisk: true, lost: false, freezesNeeded: 0 }],
    ["already settled as lost", streak(0, "2026-10-20"), "2026-10-26", 2, { current: 0, activeToday: false, atRisk: false, lost: false, freezesNeeded: 0 }],
    ["clock moved west", streak(5, "2026-10-27"), "2026-10-26", 0, { current: 5, activeToday: true, atRisk: false, lost: false, freezesNeeded: 0 }],
  ] as const)("%s", (_label, state, today, freezes, expected) => {
    expect(streakStatus(state, today, freezes)).toEqual(expected);
  });

  it("does not mutate the state", () => {
    const s = streak(5, "2026-10-24");
    const copy = structuredClone(s);
    streakStatus(s, "2026-10-26", 1);
    expect(s).toEqual(copy);
  });

  it("flips from at-risk to lost at local midnight", () => {
    const tz = "America/Los_Angeles";
    const s = streak(5, "2026-10-25");
    const beforeMidnight = localDay(new Date("2026-10-27T06:59:00Z"), tz); // Oct 26 23:59 PDT
    const afterMidnight = localDay(new Date("2026-10-27T07:00:00Z"), tz); // Oct 27 00:00 PDT
    expect(streakStatus(s, beforeMidnight, 0)).toMatchObject({ current: 5, atRisk: true });
    expect(streakStatus(s, afterMidnight, 0)).toMatchObject({ current: 0, lost: true });
  });
});

describe("calendar", () => {
  it("lists every day of the month with weekday, active and frozen flags", () => {
    const s = streak(3, "2026-10-26", { frozenDates: ["2026-10-24", "2026-10-26"] });
    const days = calendar(s, "2026-10-01", ["2026-10-23", "2026-10-25"], "2026-10-26");
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({
      date: "2026-10-01",
      day: 1,
      weekday: 3, // Thursday
      active: false,
      frozen: false,
      isToday: false,
      isFuture: false,
    });
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate["2026-10-23"]).toMatchObject({ active: true, frozen: false });
    expect(byDate["2026-10-24"]).toMatchObject({ active: false, frozen: true });
    expect(byDate["2026-10-25"]).toMatchObject({ active: true });
    // lastActiveDate counts as active even if missing from the list; active wins over frozen
    expect(byDate["2026-10-26"]).toMatchObject({
      active: true,
      frozen: false,
      isToday: true,
      weekday: 0,
    });
    expect(byDate["2026-10-27"]).toMatchObject({ isFuture: true });
  });

  it.each([
    ["2026-02", 28],
    ["2028-02-15", 29],
    ["2026-12", 31],
    ["2026-04", 30],
  ])("%s has %d days", (month, length) => {
    expect(calendar(EMPTY_STREAK, month, [])).toHaveLength(length);
  });

  it("rejects a bad month", () => {
    expect(() => calendar(EMPTY_STREAK, "2026-13", [])).toThrow();
    expect(() => calendar(EMPTY_STREAK, "nope", [])).toThrow();
  });
});

describe("activeDatesFrom", () => {
  it("dedupes and sorts local dates", () => {
    const instants = [
      "2026-10-26T07:01:00Z",
      "2026-10-26T06:59:00Z",
      "2026-10-25T12:00:00Z",
      "2026-10-26T20:00:00Z",
    ].map((s) => new Date(s));
    expect(activeDatesFrom(instants, "America/Los_Angeles")).toEqual(["2026-10-25", "2026-10-26"]);
    expect(activeDatesFrom(instants, "UTC")).toEqual(["2026-10-25", "2026-10-26"]);
    expect(activeDatesFrom(instants, "Asia/Tokyo")).toEqual([
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
  });
});
