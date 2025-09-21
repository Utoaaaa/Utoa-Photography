/*
  Warnings:

  - Added the required column `updated_at` to the `assets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "publish_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collection_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "user_id" TEXT,
    "published_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_data" TEXT NOT NULL,
    CONSTRAINT "publish_history_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_assets" ("alt", "caption", "created_at", "height", "id", "metadata_json", "width", "updated_at") SELECT "alt", "caption", "created_at", "height", "id", "metadata_json", "width", "created_at" FROM "assets";
DROP TABLE "assets";
ALTER TABLE "new_assets" RENAME TO "assets";
CREATE INDEX "assets_photographer_idx" ON "assets"("photographer");
CREATE INDEX "assets_location_idx" ON "assets"("location");
CREATE TABLE "new_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "cover_asset_id" TEXT,
    "template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "order_index" TEXT NOT NULL,
    "published_at" DATETIME,
    "last_published_at" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "collections_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "years" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collections_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_collections" ("cover_asset_id", "created_at", "id", "order_index", "published_at", "slug", "status", "summary", "template_id", "title", "updated_at", "year_id") SELECT "cover_asset_id", "created_at", "id", "order_index", "published_at", "slug", "status", "summary", "template_id", "title", "updated_at", "year_id" FROM "collections";
DROP TABLE "collections";
ALTER TABLE "new_collections" RENAME TO "collections";
CREATE INDEX "collections_year_id_status_order_index_idx" ON "collections"("year_id", "status", "order_index");
CREATE INDEX "collections_status_published_at_idx" ON "collections"("status", "published_at");
CREATE UNIQUE INDEX "collections_year_id_slug_key" ON "collections"("year_id", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "publish_history_collection_id_published_at_idx" ON "publish_history"("collection_id", "published_at");

-- CreateIndex
CREATE INDEX "publish_history_collection_id_version_idx" ON "publish_history"("collection_id", "version");
