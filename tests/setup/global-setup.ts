import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_PATH = path.resolve(__dirname, "../../prisma/test.db");

export default function setup() {
  for (const suffix of ["", "-journal"]) {
    const file = TEST_DB_PATH + suffix;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "inherit",
  });
}
