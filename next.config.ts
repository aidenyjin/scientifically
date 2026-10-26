import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Classic dynamic rendering: every app page is per-user, so Cache Components
  // buys nothing here and complicates data access. See docs/PLAN.md decisions log.
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
