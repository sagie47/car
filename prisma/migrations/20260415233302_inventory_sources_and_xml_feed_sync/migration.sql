-- AlterTable
ALTER TABLE "InventorySyncRun" ADD COLUMN     "inventorySourceId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN     "trigger" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "InventorySource" (
    "id" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySource_rooftopId_idx" ON "InventorySource"("rooftopId");

-- CreateIndex
CREATE INDEX "InventorySyncRun_inventorySourceId_idx" ON "InventorySyncRun"("inventorySourceId");

-- AddForeignKey
ALTER TABLE "InventorySource" ADD CONSTRAINT "InventorySource_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncRun" ADD CONSTRAINT "InventorySyncRun_inventorySourceId_fkey" FOREIGN KEY ("inventorySourceId") REFERENCES "InventorySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
