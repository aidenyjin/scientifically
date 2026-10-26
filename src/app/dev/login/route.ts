import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { setSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { createUser, DEMO_USER_ID } from "@/server/repo/users";

/**
 * Development only: sign in as the seeded demo user, or with ?as=<name> as a
 * separate dev user (created on first use) so testers don't share progress.
 * /dev/login?next=/shop   /dev/login?as=alice&next=/learn
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = request.nextUrl.searchParams;
  const as = params.get("as")?.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  let userId = DEMO_USER_ID;
  if (as) {
    const email = `${as}@dev.local`;
    const existing = await db.user.findUnique({ where: { email } });
    userId = existing?.id ?? (await createUser({ name: as[0].toUpperCase() + as.slice(1), email })).id;
  }
  await setSession(userId);
  const next = params.get("next") ?? "/learn";
  redirect(next.startsWith("/") ? next : "/learn");
}
