CREATE TABLE "PostingAccount" (
    "id" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dailyCapacity" INTEGER NOT NULL,
    "spacingMinutes" INTEGER NOT NULL,
    "autoSubmitEnabled" BOOLEAN NOT NULL,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostingJob" (
    "id" TEXT NOT NULL,
    "rooftopId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "accountId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "liveUrl" TEXT,
    "lastError" TEXT,
    "complianceChecks" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PostingAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" JSONB NOT NULL,
    "error" TEXT,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "PostingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostingAccount_rooftopId_idx" ON "PostingAccount"("rooftopId");
CREATE INDEX "PostingJob_rooftopId_idx" ON "PostingJob"("rooftopId");
CREATE INDEX "PostingJob_listingId_idx" ON "PostingJob"("listingId");
CREATE INDEX "PostingJob_status_scheduledFor_idx" ON "PostingJob"("status", "scheduledFor");
CREATE INDEX "PostingAttempt_jobId_startedAt_idx" ON "PostingAttempt"("jobId", "startedAt");

ALTER TABLE "PostingAccount" ADD CONSTRAINT "PostingAccount_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostingJob" ADD CONSTRAINT "PostingJob_rooftopId_fkey" FOREIGN KEY ("rooftopId") REFERENCES "Rooftop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostingJob" ADD CONSTRAINT "PostingJob_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostingJob" ADD CONSTRAINT "PostingJob_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PostingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostingAttempt" ADD CONSTRAINT "PostingAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PostingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
