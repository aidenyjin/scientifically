import { COSMETICS, type CosmeticId, type CosmeticSlot } from "@/characters/cosmetics";
import { GAME } from "./config";

/** What purchases read and change. `hearts` must already be regenerated to `now` (see hearts.ts). */
export interface Wallet {
  gems: number;
  hearts: number;
  streakFreezes: number;
  /** Owned cosmetic ids. */
  cosmetics: string[];
  /** ISO timestamp the double-XP boost runs until, or null. */
  doubleXpUntil: string | null;
}

interface BaseItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export type ShopItem =
  | (BaseItem & { kind: "streakFreeze"; maxOwned: number })
  | (BaseItem & { kind: "heartRefill" })
  | (BaseItem & { kind: "doubleXp"; minutes: number })
  | (BaseItem & { kind: "cosmetic"; cosmeticId: CosmeticId; slot: CosmeticSlot });

export type ShopItemKind = ShopItem["kind"];

const COSMETIC_ICONS: Record<CosmeticId, string> = {
  goggles: "🥽",
  "round-glasses": "👓",
  "party-hat": "🥳",
  "grad-cap": "🎓",
  "bow-tie": "🎀",
  crown: "👑",
};

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: "streak-freeze",
    kind: "streakFreeze",
    name: "Streak freeze",
    description: `Keeps your streak safe for one missed day. Hold up to ${GAME.streak.maxFreezes}.`,
    price: GAME.streak.freezeCost,
    icon: "🧊",
    maxOwned: GAME.streak.maxFreezes,
  },
  {
    id: "heart-refill",
    kind: "heartRefill",
    name: "Heart refill",
    description: `Fill all ${GAME.hearts.max} hearts right away.`,
    price: GAME.hearts.refillCost,
    icon: "❤️",
  },
  {
    id: "double-xp",
    kind: "doubleXp",
    name: "Double XP",
    description: `Earn twice the XP for ${GAME.boosts.doubleXpMinutes} minutes.`,
    price: GAME.boosts.doubleXpCost,
    icon: "⚡",
    minutes: GAME.boosts.doubleXpMinutes,
  },
  ...COSMETICS.map((c): ShopItem => ({
    id: `cosmetic:${c.id}`,
    kind: "cosmetic",
    name: c.name,
    description: "An outfit piece any character can wear.",
    price: c.price,
    icon: COSMETIC_ICONS[c.id],
    cosmeticId: c.id,
    slot: c.slot,
  })),
];

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

export type PurchaseError = "not_enough_gems" | "max_owned" | "hearts_full" | "already_owned";

export const PURCHASE_ERROR_MESSAGES: Record<PurchaseError, string> = {
  not_enough_gems: "Not enough gems",
  max_owned: "You already have the most you can hold",
  hearts_full: "Your hearts are already full",
  already_owned: "You already own this",
};

export type PurchaseResult = { ok: true; wallet: Wallet } | { ok: false; reason: PurchaseError };

/** Why `item` can't be bought right now, or null if it can (for disabling shop buttons). */
export function purchaseBlocker(item: ShopItem, wallet: Wallet, _now?: Date): PurchaseError | null {
  switch (item.kind) {
    case "streakFreeze":
      if (wallet.streakFreezes >= item.maxOwned) return "max_owned";
      break;
    case "heartRefill":
      if (wallet.hearts >= GAME.hearts.max) return "hearts_full";
      break;
    case "cosmetic":
      if (wallet.cosmetics.includes(item.cosmeticId)) return "already_owned";
      break;
    case "doubleXp":
      // Always buyable: buying while active extends the boost.
      break;
  }
  if (wallet.gems < item.price) return "not_enough_gems";
  return null;
}

/**
 * Buy `item`. Pure: returns the new wallet for the caller to persist (plus a
 * Purchase row). A heart refill also needs Wallet.heartsUpdatedAt = now.
 */
export function purchase(item: ShopItem, wallet: Wallet, now: Date): PurchaseResult {
  const blocker = purchaseBlocker(item, wallet, now);
  if (blocker) return { ok: false, reason: blocker };
  const paid: Wallet = {
    ...wallet,
    gems: wallet.gems - item.price,
    cosmetics: [...wallet.cosmetics],
  };
  switch (item.kind) {
    case "streakFreeze":
      return { ok: true, wallet: { ...paid, streakFreezes: paid.streakFreezes + 1 } };
    case "heartRefill":
      return { ok: true, wallet: { ...paid, hearts: GAME.hearts.max } };
    case "cosmetic":
      return { ok: true, wallet: { ...paid, cosmetics: [...paid.cosmetics, item.cosmeticId] } };
    case "doubleXp": {
      const from = Math.max(now.getTime(), parseUntil(wallet.doubleXpUntil));
      const until = new Date(from + item.minutes * 60_000).toISOString();
      return { ok: true, wallet: { ...paid, doubleXpUntil: until } };
    }
  }
}

export function isDoubleXpActive(wallet: Pick<Wallet, "doubleXpUntil">, now: Date): boolean {
  return parseUntil(wallet.doubleXpUntil) > now.getTime();
}

/** Milliseconds of double XP left (0 when inactive). */
export function doubleXpRemainingMs(wallet: Pick<Wallet, "doubleXpUntil">, now: Date): number {
  return Math.max(0, parseUntil(wallet.doubleXpUntil) - now.getTime());
}

function parseUntil(until: string | null): number {
  if (!until) return -Infinity;
  const t = Date.parse(until);
  return Number.isNaN(t) ? -Infinity : t;
}
