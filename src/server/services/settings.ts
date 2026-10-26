"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GAME } from "@/game/config";
import { db } from "@/server/db";
import { isValidTimeZone, parseSettings, requireUser } from "@/server/repo/users";

const settingsSchema = z.object({
  dailyGoalXp: z
    .number()
    .int()
    .refine((n) => (GAME.dailyGoalOptions as readonly number[]).includes(n))
    .optional(),
  timezone: z.string().refine(isValidTimeZone).optional(),
  name: z.string().trim().min(1).max(40).optional(),
  activePackId: z.string().optional(),
  sound: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
});

/** Update profile/settings fields. Unknown or invalid fields are rejected. */
export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<{ ok: boolean }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const user = await requireUser();
  const { sound, reduceMotion, activePackId, ...fields } = parsed.data;
  const settings = parseSettings(user.settings);
  if (sound !== undefined) settings.sound = sound;
  if (reduceMotion !== undefined) settings.reduceMotion = reduceMotion;
  let packId: string | undefined;
  if (activePackId) {
    const pack = await db.contentPack.findFirst({ where: { id: activePackId, status: "published" } });
    if (!pack) return { ok: false };
    packId = pack.id;
  }
  await db.user.update({
    where: { id: user.id },
    data: { ...fields, activePackId: packId, settings: JSON.stringify(settings) },
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
