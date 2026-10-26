import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3100/welcome",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
