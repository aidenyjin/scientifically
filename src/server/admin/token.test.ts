import { describe, expect, it } from "vitest";
import { ADMIN_SESSION_MS, passwordMatches, safeAdminNext, signAdminToken, verifyAdminToken } from "./token";

const secret = "test-secret-0123456789";
const password = "hunter2!";
const t0 = Date.UTC(2026, 9, 26, 12);

describe("admin token", () => {
  const token = signAdminToken({ secret, password, expiresAt: t0 + ADMIN_SESSION_MS });

  it("verifies a fresh token", () => {
    expect(verifyAdminToken({ secret, password, token, now: t0 })).toBe(true);
    expect(verifyAdminToken({ secret, password, token, now: t0 + ADMIN_SESSION_MS - 1 })).toBe(true);
  });

  it("rejects expired tokens", () => {
    expect(verifyAdminToken({ secret, password, token, now: t0 + ADMIN_SESSION_MS })).toBe(false);
  });

  it("rejects tokens after the password or secret changes", () => {
    expect(verifyAdminToken({ secret, password: "new-password", token, now: t0 })).toBe(false);
    expect(verifyAdminToken({ secret: "another-secret-0123456", password, token, now: t0 })).toBe(false);
  });

  it("rejects tampered or malformed tokens", () => {
    const [v, exp, sig] = token.split(".");
    expect(verifyAdminToken({ secret, password, token: `${v}.${Number(exp) + 1000}.${sig}`, now: t0 })).toBe(false);
    expect(verifyAdminToken({ secret, password, token: `${v}.${exp}.${sig.slice(1)}`, now: t0 })).toBe(false);
    expect(verifyAdminToken({ secret, password, token: "garbage", now: t0 })).toBe(false);
    expect(verifyAdminToken({ secret, password, token: "", now: t0 })).toBe(false);
    expect(verifyAdminToken({ secret, password, token: undefined, now: t0 })).toBe(false);
  });

  it("rejects tokens that claim to outlive a session", () => {
    const long = signAdminToken({ secret, password, expiresAt: t0 + ADMIN_SESSION_MS * 10 });
    expect(verifyAdminToken({ secret, password, token: long, now: t0 })).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("compares exactly and never accepts an empty password", () => {
    expect(passwordMatches("hunter2!", "hunter2!")).toBe(true);
    expect(passwordMatches("hunter2", "hunter2!")).toBe(false);
    expect(passwordMatches("HUNTER2!", "hunter2!")).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});

describe("safeAdminNext", () => {
  it("only allows admin paths", () => {
    expect(safeAdminNext("/admin/packs/demo?lesson=x")).toBe("/admin/packs/demo?lesson=x");
    expect(safeAdminNext("/admin")).toBe("/admin");
    expect(safeAdminNext("/learn")).toBe("/admin");
    expect(safeAdminNext("//evil.example/admin")).toBe("/admin");
    expect(safeAdminNext("https://evil.example")).toBe("/admin");
    expect(safeAdminNext("/administrator")).toBe("/admin");
    expect(safeAdminNext("/admin/login")).toBe("/admin");
    expect(safeAdminNext(null)).toBe("/admin");
  });
});
