-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "description" TEXT,
    "title" TEXT,
    "photographer" TEXT,
    "location" TEXT,
    "tags" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "metadata_json" TEXT,
    "location_folder_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "assets_location_folder_id_fkey" FOREIGN KEY ("location_folder_id") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_assets" ("alt", "caption", "created_at", "description", "height", "id", "location", "location_folder_id", "metadata_json", "photographer", "tags", "title", "updated_at", "width") SELECT "alt", "caption", "created_at", "description", "height", "id", "location", "location_folder_id", "metadata_json", "photographer", "tags", "title", "updated_at", "width" FROM "assets";
DROP TABLE "assets";
ALTER TABLE "new_assets" RENAME TO "assets";
CREATE INDEX "assets_photographer_idx" ON "assets"("photographer");
CREATE INDEX "assets_location_idx" ON "assets"("location");
CREATE INDEX "assets_location_folder_id_idx" ON "assets"("location_folder_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
