-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSON NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
