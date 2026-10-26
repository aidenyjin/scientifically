import "server-only";
import { db } from "@/server/db";
import { GAME } from "@/game/config";

export const DEMO_USER_ID = "demo-user";

/**
 * The signed-in user. Until accounts land (M12) this is always the demo
 * user, created on first use. Keep all callers going through this function.
 */
export async function getCurrentUser() {
  const include = { wallet: true, streak: true } as const;
  const existing = await db.user.findUnique({ where: { id: DEMO_USER_ID }, include });
  if (existing?.wallet && existing.streak) return existing;
  return db.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      wallet: existing?.wallet ? undefined : { create: { gems: GAME.gems.starting, hearts: GAME.hearts.max } },
      streak: existing?.streak ? undefined : { create: {} },
    },
    create: {
      id: DEMO_USER_ID,
      name: "Scientist",
      wallet: { create: { gems: GAME.gems.starting, hearts: GAME.hearts.max } },
      streak: { create: {} },
    },
    include,
  });
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export interface UserSettings {
  sound: boolean;
  reduceMotion: boolean;
  /** characterId → cosmetic ids worn */
  outfit: Record<string, string[]>;
}

export function parseSettings(json: string): UserSettings {
  const fallback: UserSettings = { sound: true, reduceMotion: false, outfit: {} };
  try {
    return { ...fallback, ...(JSON.parse(json) as Partial<UserSettings>) };
  } catch {
    return fallback;
  }
}
