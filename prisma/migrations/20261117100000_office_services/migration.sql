-- AlterTable: خصائص النشر والتعطيل ورابط خرائط جوجل (لا حذف لأي بيانات)
ALTER TABLE "offices" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateTable
CREATE TABLE "office_services" (
    "officeId" INTEGER NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "office_services_pkey" PRIMARY KEY ("officeId","serviceId")
);

-- CreateIndex
CREATE INDEX "office_services_serviceId_idx" ON "office_services"("serviceId");

-- AddForeignKey
ALTER TABLE "office_services" ADD CONSTRAINT "office_services_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_services" ADD CONSTRAINT "office_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- نقل الربط الحالي (الجهة ↔ قسم الخدمة) إلى ربط صريح جهة ↔ خدمة
INSERT INTO "office_services" ("officeId", "serviceId")
SELECT oc."officeId", s."id"
FROM "office_categories" oc
JOIN "services" s ON s."categoryId" = oc."categoryId"
ON CONFLICT DO NOTHING;
