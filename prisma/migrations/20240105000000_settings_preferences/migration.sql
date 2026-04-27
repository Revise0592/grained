-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1 PRIMARY KEY,
    "defaultLab" TEXT,
    "defaultDevelopProcess" TEXT,
    "defaultFilmFormat" TEXT,
    "defaultCommonTags" JSONB
);
