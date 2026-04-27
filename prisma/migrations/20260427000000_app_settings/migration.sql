-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "metadataDefaults" JSON NOT NULL,
    "importDefaults" JSON NOT NULL,
    "displayPreferences" JSON NOT NULL,
    "libraryBehavior" JSON NOT NULL,
    "dataSafety" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
