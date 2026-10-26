import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Point Prisma at a fresh temporary SQLite database with the current schema.
 * Call before importing anything that imports `@/server/db`.
 */
export function setupTempDatabase(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "sci-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  process.env.DATABASE_URL = url;
  execSync("npx prisma db push --skip-generate 2>/dev/null || npx prisma db push", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  return url;
}
