-- AlterTable
ALTER TABLE "users" ADD COLUMN "nationalIdHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_nationalIdHash_key" ON "users"("nationalIdHash");
