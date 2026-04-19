-- CreateTable
CREATE TABLE "SavedCamera" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SavedFilmStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "iso" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedCamera_name_key" ON "SavedCamera"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilmStock_name_key" ON "SavedFilmStock"("name");
