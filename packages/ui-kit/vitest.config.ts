import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 60,
        statements: 60,
      },
    },
  },
});
