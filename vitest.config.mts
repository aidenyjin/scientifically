import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // fileURLToPath (not URL.pathname) so a space in the project path isn't left as %20.
    alias: { "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    environment: "node",
    // Component tests opt in with a `// @vitest-environment jsdom` comment.
  },
});
