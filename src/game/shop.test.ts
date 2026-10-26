import { describe, expect, it } from "vitest";
import { COSMETICS } from "@/characters/cosmetics";
import { GAME } from "./config";
import {
  doubleXpRemainingMs,
  isDoubleXpActive,
  purchase,
  purchaseBlocker,
  SHOP_ITEMS,
  shopItemById,
  type ShopItem,
  type Wallet,
} from "./shop";

const NOW = new Date("2026-10-26T12:00:00Z");
const wallet = (over: Partial<Wallet> = {}): Wallet => ({
  gems: 1000,
  hearts: 3,
  streakFreezes: 0,
  cosmetics: [],
  doubleXpUntil: null,
  ...over,
});
const item = (id: string): ShopItem => {
  const found = shopItemById(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

describe("SHOP_ITEMS", () => {
  it("has the boosts plus every cosmetic, with unique ids and config prices", () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length);
    expect(item("streak-freeze").price).toBe(GAME.streak.freezeCost);
    expect(item("heart-refill").price).toBe(GAME.hearts.refillCost);
    expect(item("double-xp").price).toBe(GAME.boosts.doubleXpCost);
    for (const c of COSMETICS) {
      expect(item(`cosmetic:${c.id}`)).toMatchObject({
        kind: "cosmetic",
        cosmeticId: c.id,
        price: c.price,
        slot: c.slot,
      });
    }
    expect(shopItemById("nope")).toBeUndefined();
  });
});

describe("purchase", () => {
  it("buys a streak freeze up to the max", () => {
    const first = purchase(item("streak-freeze"), wallet(), NOW);
    expect(first).toEqual({ ok: true, wallet: wallet({ gems: 800, streakFreezes: 1 }) });
    const second = purchase(item("streak-freeze"), wallet({ streakFreezes: 1 }), NOW);
    expect(second.ok && second.wallet.streakFreezes).toBe(2);
    expect(
      purchase(item("streak-freeze"), wallet({ streakFreezes: GAME.streak.maxFreezes }), NOW),
    ).toEqual({
      ok: false,
      reason: "max_owned",
    });
  });

  it("refills hearts unless already full", () => {
    expect(purchase(item("heart-refill"), wallet({ hearts: 0 }), NOW)).toEqual({
      ok: true,
      wallet: wallet({ hearts: GAME.hearts.max, gems: 1000 - GAME.hearts.refillCost }),
    });
    expect(purchase(item("heart-refill"), wallet({ hearts: GAME.hearts.max }), NOW)).toEqual({
      ok: false,
      reason: "hearts_full",
    });
  });

  it("starts a 15-minute double XP boost, and extends an active one", () => {
    const r = purchase(item("double-xp"), wallet(), NOW);
    expect(r.ok && r.wallet.doubleXpUntil).toBe("2026-10-26T12:15:00.000Z");
    const extended = purchase(
      item("double-xp"),
      wallet({ doubleXpUntil: "2026-10-26T12:10:00.000Z" }),
      NOW,
    );
    expect(extended.ok && extended.wallet.doubleXpUntil).toBe("2026-10-26T12:25:00.000Z");
    // an expired boost starts fresh from now
    const expired = purchase(
      item("double-xp"),
      wallet({ doubleXpUntil: "2026-10-20T00:00:00.000Z" }),
      NOW,
    );
    expect(expired.ok && expired.wallet.doubleXpUntil).toBe("2026-10-26T12:15:00.000Z");
  });

  it("buys each cosmetic once", () => {
    const r = purchase(item("cosmetic:crown"), wallet({ cosmetics: ["goggles"] }), NOW);
    expect(r).toEqual({ ok: true, wallet: wallet({ gems: 200, cosmetics: ["goggles", "crown"] }) });
    expect(purchase(item("cosmetic:crown"), wallet({ cosmetics: ["crown"] }), NOW)).toEqual({
      ok: false,
      reason: "already_owned",
    });
  });

  it.each(SHOP_ITEMS.map((i) => [i.id, i] as const))("%s needs enough gems", (_id, shopItem) => {
    expect(purchase(shopItem, wallet({ gems: shopItem.price - 1, hearts: 0 }), NOW)).toEqual({
      ok: false,
      reason: "not_enough_gems",
    });
    const exact = purchase(shopItem, wallet({ gems: shopItem.price, hearts: 0 }), NOW);
    expect(exact.ok && exact.wallet.gems).toBe(0);
  });

  it("does not mutate the input wallet", () => {
    const w = wallet({ cosmetics: ["goggles"] });
    const copy = structuredClone(w);
    purchase(item("cosmetic:crown"), w, NOW);
    purchase(item("streak-freeze"), w, NOW);
    expect(w).toEqual(copy);
  });

  it("reports blockers for the shop UI, ownership before price", () => {
    expect(
      purchaseBlocker(item("cosmetic:goggles"), wallet({ gems: 0, cosmetics: ["goggles"] })),
    ).toBe("already_owned");
    expect(purchaseBlocker(item("heart-refill"), wallet({ gems: 0, hearts: 5 }))).toBe(
      "hearts_full",
    );
    expect(purchaseBlocker(item("double-xp"), wallet({ gems: 0 }))).toBe("not_enough_gems");
    expect(purchaseBlocker(item("double-xp"), wallet())).toBeNull();
  });
});

describe("double XP status", () => {
  it.each([
    [null, false, 0],
    ["2026-10-26T12:15:00.000Z", true, 15 * 60_000],
    ["2026-10-26T12:00:00.000Z", false, 0], // ends exactly now
    ["2026-10-26T11:59:59.000Z", false, 0],
    ["not a date", false, 0],
  ])("until %s → active=%s", (until, active, remaining) => {
    expect(isDoubleXpActive({ doubleXpUntil: until }, NOW)).toBe(active);
    expect(doubleXpRemainingMs({ doubleXpUntil: until }, NOW)).toBe(remaining);
  });
});
