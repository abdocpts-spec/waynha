-- AlterTable
ALTER TABLE "users" ADD COLUMN "residenceIdHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_residenceIdHash_key" ON "users"("residenceIdHash");
