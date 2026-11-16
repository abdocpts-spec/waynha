-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'NEEDS_CHANGES', 'APPROVED');

-- AlterTable
ALTER TABLE "procedure_progress" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "procedure_files" (
    "id" SERIAL NOT NULL,
    "progressId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedure_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedure_files_storedName_key" ON "procedure_files"("storedName");

-- CreateIndex
CREATE INDEX "procedure_files_progressId_idx" ON "procedure_files"("progressId");

-- AddForeignKey
ALTER TABLE "procedure_files" ADD CONSTRAINT "procedure_files_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "procedure_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
