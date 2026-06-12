import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // DB/server-action glue is exercised by the Playwright E2E suite instead
      exclude: [
        "src/lib/db/**",
        "src/lib/server/**",
        "src/lib/ingest/upsert.ts",
      ],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
