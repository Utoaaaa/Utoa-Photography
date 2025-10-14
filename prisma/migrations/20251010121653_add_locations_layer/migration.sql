-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "cover_asset_id" TEXT,
    "order_index" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "locations_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "years" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_collections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year_id" TEXT NOT NULL,
    "location_id" TEXT,
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
    "publish_note" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "seo_keywords" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "collections_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "years" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collections_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_collections" ("cover_asset_id", "created_at", "id", "last_published_at", "order_index", "publish_note", "published_at", "seo_description", "seo_keywords", "seo_title", "slug", "status", "summary", "template_id", "title", "updated_at", "version", "year_id") SELECT "cover_asset_id", "created_at", "id", "last_published_at", "order_index", "publish_note", "published_at", "seo_description", "seo_keywords", "seo_title", "slug", "status", "summary", "template_id", "title", "updated_at", "version", "year_id" FROM "collections";
DROP TABLE "collections";
ALTER TABLE "new_collections" RENAME TO "collections";
CREATE INDEX "collections_year_id_status_order_index_idx" ON "collections"("year_id", "status", "order_index");
CREATE INDEX "collections_status_published_at_idx" ON "collections"("status", "published_at");
CREATE INDEX "collections_location_id_idx" ON "collections"("location_id");
CREATE UNIQUE INDEX "collections_year_id_slug_key" ON "collections"("year_id", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "locations_year_id_order_index_idx" ON "locations"("year_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "locations_year_id_slug_key" ON "locations"("year_id", "slug");
