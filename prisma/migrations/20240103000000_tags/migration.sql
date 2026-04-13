CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

CREATE TABLE "_RollToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RollToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Roll" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RollToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_RollToTag_AB_unique" ON "_RollToTag"("A", "B");
CREATE INDEX "_RollToTag_B_index" ON "_RollToTag"("B");
