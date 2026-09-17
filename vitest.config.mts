import { defineConfig } from "vitest/config";
import path from "path";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:localdevpassword@localhost:5432/novaturientbeauty_test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: "./tests/setup/global-setup.ts",
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: "test-session-secret-not-for-real-use-0000000000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
