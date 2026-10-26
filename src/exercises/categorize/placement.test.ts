import { describe, expect, it } from "vitest";
import { activeItem, cycleActive, isComplete } from "./placement";

const tray = [2, 0, 3, 1];

describe("categorize placement", () => {
  it("the first unplaced item in tray order is active by default", () => {
    expect(activeItem(tray, [null, null, null, null], null)).toBe(2);
    expect(activeItem(tray, [null, null, "a", null], null)).toBe(0);
    expect(activeItem(tray, ["a", "b", "a", "b"], null)).toBeNull();
  });

  it("a chosen item stays active until it is placed", () => {
    expect(activeItem(tray, [null, null, null, null], 1)).toBe(1);
    expect(activeItem(tray, [null, "b", null, null], 1)).toBe(2);
  });

  it("cycles through the tray in both directions, skipping placed items", () => {
    const placement = [null, null, "a", null];
    expect(cycleActive(tray, placement, 0, 1)).toBe(3);
    expect(cycleActive(tray, placement, 1, 1)).toBe(0);
    expect(cycleActive(tray, placement, 0, -1)).toBe(1);
    expect(cycleActive(tray, ["a", "a", "a", "a"], null, 1)).toBeNull();
  });

  it("is complete only when every item is placed", () => {
    expect(isComplete(["a", "b"])).toBe(true);
    expect(isComplete(["a", null])).toBe(false);
  });
});
