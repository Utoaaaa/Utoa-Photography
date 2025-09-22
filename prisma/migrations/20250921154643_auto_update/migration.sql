-- AlterTable
ALTER TABLE "collection_assets" ADD COLUMN "slide_index" INTEGER;
ALTER TABLE "collection_assets" ADD COLUMN "text" TEXT;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN "publish_note" TEXT;
