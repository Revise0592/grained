-- Add soft-delete support on rolls
ALTER TABLE "Roll" ADD COLUMN "deletedAt" DATETIME;

-- App-wide settings singleton
CREATE TABLE "AppSettings" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  "softDeleteRetentionDays" INTEGER NOT NULL DEFAULT 30,
  "backupReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

INSERT OR IGNORE INTO "AppSettings" ("id", "softDeleteRetentionDays", "backupReminderEnabled", "createdAt", "updatedAt")
VALUES ('default', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
