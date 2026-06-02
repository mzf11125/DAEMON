import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      thresholds: {
        branches: 40,
        functions: 40,
        lines: 50,
        statements: 50,
      },
    },
  },
});
