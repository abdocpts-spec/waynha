-- CreateTable
CREATE TABLE "procedure_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "stageDates" JSONB NOT NULL DEFAULT '{}',
    "reminderAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "procedure_progress_userId_serviceId_key" ON "procedure_progress"("userId", "serviceId");

-- AddForeignKey
ALTER TABLE "procedure_progress" ADD CONSTRAINT "procedure_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_progress" ADD CONSTRAINT "procedure_progress_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
