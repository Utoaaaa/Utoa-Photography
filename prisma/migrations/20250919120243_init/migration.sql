-- CreateTable
CREATE TABLE "years" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "order_index" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "collections" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "collections_year_id_fkey" FOREIGN KEY ("year_id") REFERENCES "years" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collections_cover_asset_id_fkey" FOREIGN KEY ("cover_asset_id") REFERENCES "assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "metadata_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "collection_assets" (
    "collection_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "order_index" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("collection_id", "asset_id"),
    CONSTRAINT "collection_assets_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collection_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seo_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "og_asset_id" TEXT,
    "canonical_url" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "seo_metadata_og_asset_id_fkey" FOREIGN KEY ("og_asset_id") REFERENCES "assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "years_status_order_index_idx" ON "years"("status", "order_index");

-- CreateIndex
CREATE INDEX "collections_year_id_status_order_index_idx" ON "collections"("year_id", "status", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "collections_year_id_slug_key" ON "collections"("year_id", "slug");

-- CreateIndex
CREATE INDEX "collection_assets_collection_id_order_index_idx" ON "collection_assets"("collection_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "seo_metadata_entity_type_entity_id_key" ON "seo_metadata"("entity_type", "entity_id");
