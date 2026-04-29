/*
  Warnings:

  - You are about to alter the column `dataSafety` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `displayPreferences` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `importDefaults` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `libraryBehavior` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `metadataDefaults` on the `AppSettings` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "metadataDefaults" JSONB NOT NULL,
    "importDefaults" JSONB NOT NULL,
    "displayPreferences" JSONB NOT NULL,
    "libraryBehavior" JSONB NOT NULL,
    "dataSafety" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("dataSafety", "displayPreferences", "id", "importDefaults", "libraryBehavior", "metadataDefaults", "updatedAt") SELECT "dataSafety", "displayPreferences", "id", "importDefaults", "libraryBehavior", "metadataDefaults", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
