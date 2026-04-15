-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rooftop" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "phone" TEXT,
    "logoUrl" TEXT,
    "disclaimerText" TEXT,
    "assignmentMode" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rooftop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySyncRun" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "rowsReceived" INTEGER NOT NULL,
    "rowsImported" INTEGER NOT NULL,
    "rowsSkipped" INTEGER NOT NULL,
    "duplicateVins" JSONB NOT NULL,
    "errors" JSONB NOT NULL,

    CONSTRAINT "InventorySyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "vin" TEXT,
    "stockNumber" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "condition" TEXT,
    "mileage" INTEGER,
    "price" INTEGER,
    "bodyStyle" TEXT,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "photoUrls" JSONB NOT NULL,
    "status" TEXT,
    "vdpUrl" TEXT,
    "salespersonAssignment" TEXT,
    "carfaxUrl" TEXT,
    "optionsList" JSONB NOT NULL,
    "drivetrain" TEXT,
    "transmission" TEXT,
    "fuelType" TEXT,
    "engine" TEXT,
    "daysInInventory" INTEGER,
    "featured" BOOLEAN NOT NULL,
    "priceHistory" JSONB NOT NULL,
    "rawSource" JSONB NOT NULL,
    "naturalKey" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "syncIssues" JSONB NOT NULL,
    "isStale" BOOLEAN NOT NULL,
    "eligibility" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSnapshot" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "rawSource" JSONB NOT NULL,

    CONSTRAINT "VehicleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "sourceChannel" TEXT NOT NULL,
    "sourceSubchannel" TEXT,
    "assignedRepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "firstResponseAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "disposition" TEXT,
    "appointmentSet" BOOLEAN NOT NULL,
    "sold" BOOLEAN NOT NULL,
    "attributedValue" INTEGER,
    "suggestedResponse" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rooftop_dealerId_idx" ON "Rooftop"("dealerId");

-- CreateIndex
CREATE INDEX "InventorySyncRun_rooftopId_idx" ON "InventorySyncRun"("rooftopId");

-- CreateIndex
CREATE INDEX "InventorySyncRun_dealerId_idx" ON "InventorySyncRun"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_naturalKey_key" ON "Vehicle"("naturalKey");

-- CreateIndex
CREATE INDEX "Vehicle_rooftopId_idx" ON "Vehicle"("rooftopId");

-- CreateIndex
CREATE INDEX "Vehicle_dealerId_idx" ON "Vehicle"("dealerId");

-- CreateIndex
CREATE INDEX "VehicleSnapshot_vehicleId_capturedAt_idx" ON "VehicleSnapshot"("vehicleId", "capturedAt");

-- CreateIndex
CREATE INDEX "VehicleSnapshot_syncRunId_idx" ON "VehicleSnapshot"("syncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_vehicleId_key" ON "Listing"("vehicleId");

-- CreateIndex
CREATE INDEX "Listing_rooftopId_idx" ON "Listing"("rooftopId");

-- CreateIndex
CREATE INDEX "ListingEvent_listingId_createdAt_idx" ON "ListingEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_rooftopId_idx" ON "Lead"("rooftopId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_createdAt_idx" ON "LeadEvent"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Rooftop" ADD CONSTRAINT "Rooftop_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncRun" ADD CONSTRAINT "InventorySyncRun_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySyncRun" ADD CONSTRAINT "InventorySyncRun_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSnapshot" ADD CONSTRAINT "VehicleSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSnapshot" ADD CONSTRAINT "VehicleSnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "InventorySyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEvent" ADD CONSTRAINT "ListingEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
