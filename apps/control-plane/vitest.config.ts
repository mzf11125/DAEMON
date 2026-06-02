import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      include: ["src/**/*.ts"],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 60,
        statements: 60,
      },
    },
  },
});
