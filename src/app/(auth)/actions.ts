"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GAME } from "@/game/config";
import { clearSession, setSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { createUser, getCurrentUser, isValidTimeZone } from "@/server/repo/users";

export type FormState = { error?: string } | undefined;

const goalSchema = z.coerce
  .number()
  .int()
  .refine((n) => (GAME.dailyGoalOptions as readonly number[]).includes(n));

function tzOrUtc(value: FormDataEntryValue | null): string {
  const tz = typeof value === "string" ? value : "";
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

/** Start learning without an account (Duolingo-style). Progress can be saved later via signup. */
export async function startAsGuest(formData: FormData): Promise<void> {
  const goal = goalSchema.safeParse(formData.get("dailyGoal"));
  const packId = String(formData.get("packId") ?? "");
  const pack = packId ? await db.contentPack.findFirst({ where: { id: packId, status: "published" } }) : null;
  const user = await createUser({
    name: "Scientist",
    dailyGoalXp: goal.success ? goal.data : 20,
    timezone: tzOrUtc(formData.get("timezone")),
    activePackId: pack?.id ?? null,
  });
  await setSession(user.id);
  redirect("/learn");
}

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password don't match." };
  }
  await setSession(user.id);
  redirect("/learn");
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(40),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** Create a profile. A guest keeps their progress: credentials are attached to the same user. */
export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { name, email, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "An account with that email already exists." };
  const passwordHash = await bcrypt.hash(password, 10);

  const current = await getCurrentUser();
  if (current && !current.email) {
    await db.user.update({ where: { id: current.id }, data: { name, email, passwordHash } });
    redirect("/learn");
  }
  const user = await createUser({ name, email, passwordHash, timezone: tzOrUtc(formData.get("timezone")) });
  await setSession(user.id);
  redirect("/learn");
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/welcome");
}
