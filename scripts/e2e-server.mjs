// Starts a production server for Playwright on a throwaway database:
// fresh SQLite file, schema push, demo seed, build with test hooks, start.
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

const env = {
  ...process.env,
  DATABASE_URL: "file:./e2e.db",
  NEXT_PUBLIC_E2E: "1",
  ADMIN_PASSWORD: "e2e-admin-password",
  AI_PROVIDER: "mock",
  AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret",
};
rmSync("e2e.db", { force: true });
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });
run("npx prisma db push");
run("npm run db:seed");
if (!process.env.E2E_SKIP_BUILD) run("npx next build");
spawn("npx", ["next", "start", "-p", "3100"], { stdio: "inherit", env });
