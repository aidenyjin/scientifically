import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure helpers for the admin gate (no Next APIs, so they are unit tested).
 * The cookie value is `v1.<expiresAtMs>.<hmac>`; the HMAC key mixes
 * AUTH_SECRET with a hash of ADMIN_PASSWORD, so changing the password signs
 * every existing admin session out.
 */
export const ADMIN_COOKIE = "sci_admin";
export const ADMIN_SESSION_DAYS = 7;
export const ADMIN_SESSION_MS = ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000;

const VERSION = "v1";

function signingKey(secret: string, password: string): Buffer {
  const passwordHash = createHash("sha256").update(password).digest();
  return createHmac("sha256", secret).update("sci-admin:").update(passwordHash).digest();
}

function mac(secret: string, password: string, payload: string): string {
  return createHmac("sha256", signingKey(secret, password)).update(payload).digest("base64url");
}

/** Constant-time string comparison (hashes first, so lengths don't leak either). */
export function safeEqual(a: string, b: string): boolean {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export function passwordMatches(given: string, expected: string): boolean {
  // Compare even when empty so timing doesn't reveal anything; never accept an empty password.
  const same = safeEqual(given, expected);
  return same && expected.length > 0;
}

export function signAdminToken(opts: { secret: string; password: string; expiresAt: number }): string {
  const payload = `${VERSION}.${Math.floor(opts.expiresAt)}`;
  return `${payload}.${mac(opts.secret, opts.password, payload)}`;
}

/** True when the token was signed with this secret + password and hasn't expired. */
export function verifyAdminToken(opts: {
  secret: string;
  password: string;
  token: string | undefined | null;
  now: number;
}): boolean {
  const token = opts.token;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return false;
  const expiresAt = Number(parts[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= opts.now) return false;
  // Reject tokens claiming to last longer than a session can (e.g. forged with an old secret).
  if (expiresAt - opts.now > ADMIN_SESSION_MS + 60_000) return false;
  const expected = mac(opts.secret, opts.password, `${parts[0]}.${parts[1]}`);
  return safeEqual(parts[2], expected);
}

/** Only same-site admin paths are allowed as post-login destinations. */
export function safeAdminNext(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  if (!/^\/admin(?:[/?#]|$)/.test(next) || next.startsWith("//") || next.startsWith("/admin/login")) return "/admin";
  return next;
}
