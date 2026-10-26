import { describe, expect, it } from "vitest";
import { addDays, daysBetween, localDateString } from "./clock";
import { hashString, shuffle, shuffledOrder } from "./rng";

describe("rng", () => {
  it("shuffles deterministically", () => {
    expect(shuffle([1, 2, 3, 4, 5], 42)).toEqual(shuffle([1, 2, 3, 4, 5], 42));
    expect(shuffle([1, 2, 3, 4, 5], 42).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("never returns the identity order", () => {
    for (let seed = 0; seed < 200; seed++) {
      const order = shuffledOrder(3, seed);
      expect(order).not.toEqual([0, 1, 2]);
      expect([...order].sort()).toEqual([0, 1, 2]);
    }
  });

  it("hashes strings stably", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });
});

describe("clock", () => {
  it("formats local dates across time zones", () => {
    const d = new Date("2026-03-10T23:30:00Z");
    expect(localDateString(d, "UTC")).toBe("2026-03-10");
    expect(localDateString(d, "Asia/Tokyo")).toBe("2026-03-11");
    expect(localDateString(d, "America/Los_Angeles")).toBe("2026-03-10");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2026-02-27", "2026-03-01")).toBe(2);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
