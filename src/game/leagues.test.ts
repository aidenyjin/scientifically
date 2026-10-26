import { describe, expect, it } from "vitest";
import { GAME } from "./config";
import {
  botsFor,
  groupIdFor,
  isoWeeksInYear,
  leagueTable,
  resolveWeek,
  shiftWeek,
  standings,
  tierName,
  timeLeft,
  TOP_TIER,
  weekBounds,
  weekIdFor,
  weekOutcome,
  zoneFor,
  zoneSizes,
} from "./leagues";

const HOUR = 3_600_000;

describe("weekIdFor", () => {
  it.each([
    ["2026-10-26T00:00:00Z", "2026-W44"], // Monday
    ["2026-10-25T23:59:59.999Z", "2026-W43"], // Sunday night UTC
    ["2026-11-01T23:59:59Z", "2026-W44"],
    ["2026-01-01T12:00:00Z", "2026-W01"], // Thursday Jan 1 → week 1
    ["2025-12-29T00:00:00Z", "2026-W01"], // Monday of 2026-W01 is in 2025
    ["2025-12-28T23:59:59Z", "2025-W52"],
    ["2027-01-01T00:00:00Z", "2026-W53"], // 2026 has 53 weeks
    ["2027-01-03T23:00:00Z", "2026-W53"],
    ["2027-01-04T00:00:00Z", "2027-W01"],
    ["2021-01-03T00:00:00Z", "2020-W53"],
    ["2024-12-30T00:00:00Z", "2025-W01"],
    ["2028-02-29T12:00:00Z", "2028-W09"], // leap day
  ])("%s → %s", (iso, week) => {
    expect(weekIdFor(new Date(iso))).toBe(week);
  });

  it("uses UTC, not local time", () => {
    // Sunday 20:00 in New York is already Monday 00:00 UTC: a new league week.
    expect(weekIdFor(new Date("2026-10-26T00:30:00Z"))).toBe("2026-W44");
  });

  it("knows 52- and 53-week years", () => {
    expect(isoWeeksInYear(2026)).toBe(53);
    expect(isoWeeksInYear(2027)).toBe(52);
    expect(isoWeeksInYear(2020)).toBe(53);
  });
});

describe("weekBounds", () => {
  it("returns Monday 00:00 UTC to the next Monday", () => {
    const { start, end } = weekBounds("2026-W44");
    expect(start.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(weekBounds("2026-W01").start.toISOString()).toBe("2025-12-29T00:00:00.000Z");
    expect(weekBounds("2026-W53").end.toISOString()).toBe("2027-01-04T00:00:00.000Z");
  });

  it("round-trips with weekIdFor for every week over several years", () => {
    let week = "2024-W01";
    for (let i = 0; i < 52 * 6; i++) {
      const { start, end } = weekBounds(week);
      expect(end.getTime() - start.getTime()).toBe(7 * 24 * HOUR);
      expect(start.getUTCDay()).toBe(1);
      expect(weekIdFor(start)).toBe(week);
      expect(weekIdFor(new Date(end.getTime() - 1))).toBe(week);
      const next = shiftWeek(week, 1);
      expect(weekBounds(next).start.getTime()).toBe(end.getTime());
      week = next;
    }
  });

  it("rejects bad ids", () => {
    for (const bad of ["2026-44", "2026-W00", "2027-W53", "2026-W54", "nope"]) {
      expect(() => weekBounds(bad)).toThrow();
    }
  });

  it("shifts weeks across year boundaries", () => {
    expect(shiftWeek("2026-W53", 1)).toBe("2027-W01");
    expect(shiftWeek("2027-W01", -1)).toBe("2026-W53");
    expect(shiftWeek("2026-W44", -44)).toBe("2025-W52");
  });
});

describe("timeLeft", () => {
  it("counts down to Monday 00:00 UTC", () => {
    expect(timeLeft(new Date("2026-10-26T00:00:00Z"))).toBe(7 * 24 * HOUR);
    expect(timeLeft(new Date("2026-11-01T23:00:00Z"))).toBe(HOUR);
    expect(timeLeft(new Date("2026-11-01T23:59:59.999Z"))).toBe(1);
    expect(timeLeft(new Date("2026-11-02T00:00:00Z"))).toBe(7 * 24 * HOUR);
  });
});

describe("groups", () => {
  it("is deterministic and puts everyone in one group by default", () => {
    expect(groupIdFor("2026-W44", 2, "u1")).toBe("2026-W44:t2:g0");
    expect(groupIdFor("2026-W44", 2, "u2")).toBe("2026-W44:t2:g0");
    expect(groupIdFor("2026-W44", 3, "u1")).not.toBe(groupIdFor("2026-W44", 2, "u1"));
  });

  it("spreads users across buckets when asked", () => {
    const groups = new Set(
      Array.from({ length: 200 }, (_, i) => groupIdFor("2026-W44", 0, `user-${i}`, 4)),
    );
    expect(groups).toEqual(new Set([0, 1, 2, 3].map((b) => `2026-W44:t0:g${b}`)));
    expect(groupIdFor("2026-W44", 0, "u1", 4)).toBe(groupIdFor("2026-W44", 0, "u1", 4));
  });
});

describe("botsFor", () => {
  const week = "2026-W44";
  const { start, end } = weekBounds(week);
  const group = groupIdFor(week, 0, "u1");

  it("is deterministic", () => {
    const a = botsFor(week, group, 0, 29);
    const b = botsFor(week, group, 0, 29);
    expect(a.map((x) => [x.id, x.name, x.color, x.weeklyTotal])).toEqual(
      b.map((x) => [x.id, x.name, x.color, x.weeklyTotal]),
    );
    const mid = new Date(start.getTime() + 80 * HOUR);
    expect(a.map((x) => x.xpAt(mid))).toEqual(b.map((x) => x.xpAt(mid)));
  });

  it("returns the requested number of uniquely named bots", () => {
    expect(botsFor(week, group, 0, 0)).toEqual([]);
    for (const n of [1, 29, 150]) {
      const bots = botsFor(week, group, 0, n);
      expect(bots).toHaveLength(n);
      expect(new Set(bots.map((b) => b.name)).size).toBe(n);
      expect(new Set(bots.map((b) => b.id)).size).toBe(n);
      for (const b of bots) {
        expect(b.isBot).toBe(true);
        expect(b.name).toMatch(/^[A-Z][A-Za-z]+\d*$/);
        expect(b.color).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("differs between groups and weeks", () => {
    const names = (w: string, g: string) =>
      botsFor(w, g, 0, 29)
        .map((b) => b.name)
        .join();
    expect(names(week, group)).not.toBe(names(week, groupIdFor(week, 1, "u1")));
    expect(names(week, group)).not.toBe(names("2026-W45", groupIdFor("2026-W45", 0, "u1")));
  });

  it("grows XP monotonically within the week, in bursts", () => {
    for (const bot of botsFor(week, group, 0, 29)) {
      expect(bot.xpAt(new Date(start.getTime() - 1))).toBe(0);
      expect(bot.xpAt(new Date(end.getTime() - 1))).toBe(bot.weeklyTotal);
      expect(bot.xpAt(new Date(end.getTime() + 48 * HOUR))).toBe(bot.weeklyTotal);
      expect(bot.weeklyTotal).toBeGreaterThan(0);
      let prev = 0;
      let flatHours = 0;
      let maxJump = 0;
      for (let h = 1; h <= 168; h++) {
        const xp = bot.xpAt(new Date(start.getTime() + h * HOUR));
        expect(xp).toBeGreaterThanOrEqual(prev);
        if (xp === prev) flatHours++;
        maxJump = Math.max(maxJump, xp - prev);
        prev = xp;
      }
      // not linear: most hours nothing happens, then a session adds a lesson or more at once
      expect(flatHours).toBeGreaterThan(100);
      expect(maxJump).toBeGreaterThanOrEqual(GAME.leagues.bots.lessonXpMin);
    }
  });

  it("is beatable at the bottom tier and keener in higher tiers", () => {
    const seventh = (tier: number) => {
      let sum = 0;
      for (let g = 0; g < 100; g++) {
        const totals = botsFor(week, `${week}:t${tier}:g${g}`, tier, 29)
          .map((b) => b.weeklyTotal)
          .sort((a, b) => b - a);
        sum += totals[GAME.leagues.promote - 1];
      }
      return sum / 100;
    };
    const quark = seventh(0);
    const galaxy = seventh(TOP_TIER);
    // Promotion from Quark needs roughly two lessons a day.
    expect(quark).toBeGreaterThan(100);
    expect(quark).toBeLessThan(350);
    expect(galaxy).toBeGreaterThan(quark * 1.8);
  });
});

describe("standings", () => {
  const now = new Date("2026-10-28T12:00:00Z");

  it("sorts by XP descending with stable ties and unique ranks", () => {
    const rows = standings(
      [
        { id: "a", xp: 30 },
        { id: "b", xp: 50 },
        { id: "c", xp: 30 },
        { id: "d", xpAt: () => 50 },
        { id: "e", xp: 0 },
      ],
      now,
    );
    expect(rows.map((r) => [r.id, r.xp, r.rank])).toEqual([
      ["b", 50, 1],
      ["d", 50, 2],
      ["a", 30, 3],
      ["c", 30, 4],
      ["e", 0, 5],
    ]);
  });

  it("evaluates bots at `now`", () => {
    const [bot] = botsFor("2026-W44", "g", 0, 1);
    const early = standings([bot, { id: "me", xp: 1 }], new Date("2026-10-26T00:00:00Z"));
    expect(early.map((r) => r.id)).toEqual(["me", bot.id]);
    const late = standings([{ id: "me", xp: 1 }, bot], new Date("2026-11-01T23:59:00Z"));
    expect(late.map((r) => r.id)).toEqual([bot.id, "me"]);
    expect(late[0].xp).toBe(bot.weeklyTotal);
  });

  it("keeps extra fields", () => {
    const [row] = standings([{ id: "me", xp: 3, name: "Ada" }], now);
    expect(row).toEqual({ id: "me", xp: 3, name: "Ada", rank: 1 });
  });
});

describe("zones", () => {
  it.each([
    // rank, size, tier → zone
    [1, 30, 0, "promote"],
    [7, 30, 0, "promote"],
    [8, 30, 0, "stay"],
    [25, 30, 0, "stay"], // bottom tier: no demotion
    [26, 30, 0, "stay"],
    [26, 30, 1, "demote"],
    [25, 30, 1, "stay"],
    [30, 30, 5, "demote"],
    [1, 30, TOP_TIER, "stay"], // top tier: no promotion
    [30, 30, TOP_TIER, "demote"],
    [0, 30, 3, "stay"],
    [31, 30, 3, "stay"],
  ] as const)("rank %d of %d in tier %d → %s", (rank, size, tier, zone) => {
    expect(zoneFor(rank, size, tier)).toBe(zone);
  });

  it("scales zones down for small groups without overlapping", () => {
    expect(zoneSizes(30)).toEqual({ promote: 7, demote: 5 });
    expect(zoneSizes(40)).toEqual({ promote: 7, demote: 5 });
    expect(zoneSizes(10)).toEqual({ promote: 2, demote: 2 });
    expect(zoneSizes(1)).toEqual({ promote: 1, demote: 0 });
    expect(zoneSizes(0)).toEqual({ promote: 0, demote: 0 });
    for (let size = 1; size <= 30; size++) {
      const z = zoneSizes(size);
      expect(z.promote + z.demote).toBeLessThanOrEqual(size);
    }
  });

  it("resolves the week into a new tier and outcome", () => {
    expect(resolveWeek(1, 30, 0)).toBe(1);
    expect(resolveWeek(10, 30, 4)).toBe(4);
    expect(resolveWeek(30, 30, 4)).toBe(3);
    expect(resolveWeek(30, 30, 0)).toBe(0);
    expect(resolveWeek(1, 30, TOP_TIER)).toBe(TOP_TIER);
    expect(weekOutcome(3, 30, 2)).toBe("promoted");
    expect(weekOutcome(28, 30, 2)).toBe("demoted");
    expect(weekOutcome(15, 30, 2)).toBe("stayed");
  });

  it("names tiers", () => {
    expect(tierName(0)).toBe("Quark");
    expect(tierName(TOP_TIER)).toBe("Galaxy");
    expect(tierName(99)).toBe("Galaxy");
    expect(tierName(-1)).toBe("Quark");
  });
});

describe("leagueTable", () => {
  it("tops the group up with bots and assigns zones", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    const table = leagueTable(
      {
        weekId: "2026-W44",
        groupId: "2026-W44:t1:g0",
        tier: 1,
        members: [{ id: "u1", name: "Ada", xp: 10_000 }],
      },
      now,
    );
    expect(table).toHaveLength(GAME.leagues.groupSize);
    expect(table[0]).toMatchObject({ id: "u1", rank: 1, zone: "promote", isBot: false });
    expect(table.filter((r) => r.isBot)).toHaveLength(GAME.leagues.groupSize - 1);
    expect(table.filter((r) => r.zone === "promote")).toHaveLength(7);
    expect(table.filter((r) => r.zone === "demote")).toHaveLength(5);
    expect(table.map((r) => r.rank)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("lets members win ties against bots", () => {
    const now = new Date("2026-10-26T00:00:00Z"); // nobody has played yet
    const table = leagueTable(
      { weekId: "2026-W44", groupId: "g", tier: 0, members: [{ id: "u1", name: "Ada", xp: 0 }] },
      now,
    );
    expect(table[0].id).toBe("u1");
  });
});
