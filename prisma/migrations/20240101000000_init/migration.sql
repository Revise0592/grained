-- CreateTable
CREATE TABLE "Roll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "filmStock" TEXT,
    "filmFormat" TEXT,
    "iso" INTEGER,
    "pushPull" TEXT,
    "camera" TEXT,
    "lens" TEXT,
    "dateShotStart" DATETIME,
    "dateShotEnd" DATETIME,
    "lab" TEXT,
    "dateDeveloped" DATETIME,
    "developProcess" TEXT,
    "coverPhotoId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rollId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "frameNumber" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shutterSpeed" TEXT,
    "aperture" TEXT,
    "exposureComp" TEXT,
    "focalLength" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "Roll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RollComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rollId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RollComment_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "Roll" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhotoComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "photoId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhotoComment_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Roll_slug_key" ON "Roll"("slug");
