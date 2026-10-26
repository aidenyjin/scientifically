import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { now } from "@/lib/clock";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MS,
  passwordMatches,
  safeAdminNext,
  signAdminToken,
  verifyAdminToken,
} from "./token";

/**
 * Admin gate: ADMIN_PASSWORD + a signed, httpOnly `sci_admin` cookie (7 days).
 *
 * - Password set: log in at /admin/login.
 * - Password unset in development: open, with a warning banner.
 * - Password unset in production: admin is disabled (explanatory page).
 *
 * Layouts are not a security boundary, so every admin page, server action and
 * route handler checks the gate itself (requireAdmin / assertAdmin / isAdmin).
 */
export type AdminGate =
  | { kind: "authed" }
  | { kind: "open-dev" }
  | { kind: "anonymous" }
  | { kind: "disabled" };

const COOKIE_PATH = "/admin";

function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length > 0 ? value : null;
}

const isProduction = () => process.env.NODE_ENV === "production";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (isProduction()) throw new Error("AUTH_SECRET must be set (16+ chars) in production");
  return "dev-only-insecure-secret-change-me";
}

export async function getAdminGate(): Promise<AdminGate> {
  const password = adminPassword();
  if (!password) return isProduction() ? { kind: "disabled" } : { kind: "open-dev" };
  const store = await cookies();
  const ok = verifyAdminToken({
    secret: secret(),
    password,
    token: store.get(ADMIN_COOKIE)?.value,
    now: now().getTime(),
  });
  return ok ? { kind: "authed" } : { kind: "anonymous" };
}

const allowed = (gate: AdminGate) => gate.kind === "authed" || gate.kind === "open-dev";

/** For pages: redirect to the login page unless the visitor may use admin. */
export async function requireAdmin(from?: string): Promise<AdminGate> {
  const gate = await getAdminGate();
  if (allowed(gate)) return gate;
  const next = from ? `?next=${encodeURIComponent(safeAdminNext(from))}` : "";
  redirect(`/admin/login${next}`);
}

/** For route handlers: a plain boolean. */
export async function isAdmin(): Promise<boolean> {
  return allowed(await getAdminGate());
}

/** For server actions: throws, so a forged POST never reaches the mutation. */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Unauthorized: admin login required.");
}

/** Check the password and set the session cookie. Only callable from server actions. */
export async function loginAdmin(given: string): Promise<boolean> {
  const password = adminPassword();
  if (!password || !passwordMatches(given, password)) return false;
  const store = await cookies();
  store.set(ADMIN_COOKIE, signAdminToken({ secret: secret(), password, expiresAt: now().getTime() + ADMIN_SESSION_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: COOKIE_PATH,
    maxAge: Math.floor(ADMIN_SESSION_MS / 1000),
  });
  return true;
}

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: isProduction(), path: COOKIE_PATH, maxAge: 0 });
}
