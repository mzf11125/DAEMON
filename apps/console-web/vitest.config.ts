import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
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
