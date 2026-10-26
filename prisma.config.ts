import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Default so `npm install` (postinstall: prisma generate) works before .env exists.
  datasource: { url: process.env.DATABASE_URL ?? "file:./dev.db" },
});
