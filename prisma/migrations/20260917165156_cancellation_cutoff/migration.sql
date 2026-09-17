-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SchedulingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Brussels',
    "minNoticeMinutes" INTEGER NOT NULL DEFAULT 1440,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 15,
    "cancellationCutoffMinutes" INTEGER NOT NULL DEFAULT 1440,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SchedulingSettings" ("bufferAfterMinutes", "bufferBeforeMinutes", "id", "maxAdvanceDays", "minNoticeMinutes", "timezone", "updatedAt") SELECT "bufferAfterMinutes", "bufferBeforeMinutes", "id", "maxAdvanceDays", "minNoticeMinutes", "timezone", "updatedAt" FROM "SchedulingSettings";
DROP TABLE "SchedulingSettings";
ALTER TABLE "new_SchedulingSettings" RENAME TO "SchedulingSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
