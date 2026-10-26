"use server";

import { revalidatePath } from "next/cache";
import { COSMETICS } from "@/characters/cosmetics";
import { CHARACTER_IDS } from "@/content/schema/exercise-base";
import { db } from "@/server/db";
import { parseSettings, requireUser } from "@/server/repo/users";
import { buyItem } from "@/server/services/lesson-completion";
import { parseJson } from "@/server/services/player";

export type BuyResult = { ok: true; gems: number; message: string } | { ok: false; error: string };

export async function buyItemAction(itemId: string): Promise<BuyResult> {
  const user = await requireUser();
  const result = await buyItem(user, itemId);
  revalidatePath("/", "layout");
  if (!result.ok) return { ok: false, error: result.error };
  const extra = result.achievements.length ? ` Achievement unlocked: ${result.achievements.join(", ")}!` : "";
  return { ok: true, gems: result.wallet.gems, message: `${result.item.name} purchased!${extra}` };
}

/** Wear or remove an owned cosmetic on a character. One item per slot. */
export async function setOutfitAction(characterId: string, cosmeticId: string, wear: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!(CHARACTER_IDS as readonly string[]).includes(characterId)) return { ok: false };
  const item = COSMETICS.find((c) => c.id === cosmeticId);
  const owned = parseJson<string[]>(user.wallet?.cosmetics, []);
  if (!item || !owned.includes(cosmeticId)) return { ok: false };
  const settings = parseSettings(user.settings);
  const current = (settings.outfit[characterId] ?? []).filter((id) => {
    const other = COSMETICS.find((c) => c.id === id);
    return other && other.slot !== item.slot;
  });
  settings.outfit[characterId] = wear ? [...current, cosmeticId] : current;
  await db.user.update({ where: { id: user.id }, data: { settings: JSON.stringify(settings) } });
  revalidatePath("/", "layout");
  return { ok: true };
}
