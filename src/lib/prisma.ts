import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// SQLite (local dev/tests) allows only one writer at a time. Without this,
// a query that arrives while another write holds the file lock fails
// immediately with SQLITE_BUSY instead of waiting briefly for its turn.
// Postgres (production) ignores this — it has real row-level locking.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  void prisma.$executeRawUnsafe("PRAGMA busy_timeout = 10000;");
}
