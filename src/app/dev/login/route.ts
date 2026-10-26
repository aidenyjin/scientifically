import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { setSession } from "@/server/auth/session";
import { DEMO_USER_ID } from "@/server/repo/users";

/** Development only: sign in as the seeded demo user. /dev/login?next=/shop */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") notFound();
  await setSession(DEMO_USER_ID);
  const next = request.nextUrl.searchParams.get("next") ?? "/learn";
  redirect(next.startsWith("/") ? next : "/learn");
}
