import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:localdevpassword@localhost:5432/novaturientbeauty_test";

export default async function setup() {
  // Start every test run from a clean, empty schema.
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS "public" CASCADE; CREATE SCHEMA "public";');
  await client.end();

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
