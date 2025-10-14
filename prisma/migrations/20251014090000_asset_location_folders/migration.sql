-- AlterTable
ALTER TABLE "assets" ADD COLUMN "location_folder_id" TEXT;

-- CreateIndex
CREATE INDEX "assets_location_folder_id_idx" ON "assets"("location_folder_id");
