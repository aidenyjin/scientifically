import "server-only";
import { redirect } from "next/navigation";
import { GAME } from "@/game/config";
import { getSessionUserId } from "@/server/auth/session";
import { db } from "@/server/db";

export const DEMO_USER_ID = "demo-user";

const include = { wallet: true, streak: true } as const;

/** The signed-in user (guest or registered), or null when there is no session. */
export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, include });
  if (!user) return null;
  if (user.wallet && user.streak) return user;
  // Repair users created without their 1:1 rows.
  return db.user.update({
    where: { id },
    data: {
      wallet: user.wallet ? undefined : { create: { gems: GAME.gems.starting, hearts: GAME.hearts.max } },
      streak: user.streak ? undefined : { create: {} },
    },
    include,
  });
}

/** Like getCurrentUser, but sends visitors without a session to /welcome. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/welcome");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function createUser(data: {
  name: string;
  email?: string;
  passwordHash?: string;
  dailyGoalXp?: number;
  timezone?: string;
  activePackId?: string | null;
}) {
  return db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      dailyGoalXp: data.dailyGoalXp ?? 20,
      timezone: data.timezone ?? "UTC",
      activePackId: data.activePackId ?? null,
      wallet: { create: { gems: GAME.gems.starting, hearts: GAME.hearts.max } },
      streak: { create: {} },
    },
    include,
  });
}

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

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
