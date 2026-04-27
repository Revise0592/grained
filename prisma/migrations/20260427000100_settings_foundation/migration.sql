-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "appName" TEXT,
    "appDescription" TEXT,
    "autoSaveLibraryItems" BOOLEAN,
    "allowDuplicateFilenames" BOOLEAN,
    "defaultTheme" TEXT,
    "showStatsBar" BOOLEAN,
    "showArchivedItems" BOOLEAN,
    "enableSoftDelete" BOOLEAN,
    "confirmDestructiveActions" BOOLEAN,
    "redactSensitiveMetadata" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
