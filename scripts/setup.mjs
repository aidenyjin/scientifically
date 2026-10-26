// One-time local setup: create .env from the example, create the SQLite
// database and seed the demo course. Safe to re-run.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}
const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx prisma generate");
run("npx prisma db push");
run("npm run db:seed");
console.log("\nReady. Start the app with: npm run dev   (then open http://localhost:3000)");
