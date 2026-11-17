-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_WEBSITE', 'OFFICIAL_DOCUMENT', 'OFFICE_VISIT', 'PHONE_CALL', 'ANNOUNCEMENT', 'OTHER');
-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('UNCHECKED', 'OK', 'BROKEN');
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "ReportKind" ADD VALUE 'DOCUMENTS';
ALTER TYPE "ReportKind" ADD VALUE 'STEPS';
ALTER TYPE "ReportKind" ADD VALUE 'FEES';
ALTER TYPE "ReportKind" ADD VALUE 'HOURS';
ALTER TYPE "ReportKind" ADD VALUE 'SOURCE_LINK';
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "reviewIntervalDays" INTEGER NOT NULL DEFAULT 180;
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "contentEditedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewAt" TIMESTAMP(3),
ADD COLUMN     "reviewIntervalDays" INTEGER,
ADD COLUMN     "reviewedById" INTEGER;
-- CreateTable
CREATE TABLE "service_sources" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "type" "SourceType" NOT NULL DEFAULT 'OTHER',
    "url" TEXT,
    "accessedAt" TIMESTAMP(3),
    "note" TEXT,
    "linkStatus" "LinkStatus" NOT NULL DEFAULT 'UNCHECKED',
    "linkCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_sources_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "service_audits" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" INTEGER,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "sourceName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_audits_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "service_sources_serviceId_idx" ON "service_sources"("serviceId");
-- CreateIndex
CREATE INDEX "service_audits_serviceId_createdAt_idx" ON "service_audits"("serviceId", "createdAt");
-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "service_sources" ADD CONSTRAINT "service_sources_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "service_audits" ADD CONSTRAINT "service_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
