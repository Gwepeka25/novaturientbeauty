import { defineConfig } from "vitest/config";
import path from "path";

const TEST_DB_PATH = path.resolve(import.meta.dirname, "prisma/test.db");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: "./tests/setup/global-setup.ts",
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${TEST_DB_PATH}`,
      SESSION_SECRET: "test-session-secret-not-for-real-use-0000000000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
