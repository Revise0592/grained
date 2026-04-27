-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "cardDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "dateDisplayFormat" TEXT NOT NULL DEFAULT 'relative'
);

-- Seed singleton row
INSERT INTO "AppSettings" ("id", "themeMode", "cardDensity", "dateDisplayFormat")
VALUES (1, 'dark', 'comfortable', 'relative');
