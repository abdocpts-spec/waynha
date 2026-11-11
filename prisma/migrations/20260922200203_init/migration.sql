-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📄',
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "shortDescAr" TEXT NOT NULL,
    "shortDescEn" TEXT NOT NULL,
    "departmentAr" TEXT NOT NULL,
    "departmentEn" TEXT NOT NULL,
    "feesAr" TEXT NOT NULL,
    "feesEn" TEXT NOT NULL,
    "durationAr" TEXT NOT NULL,
    "durationEn" TEXT NOT NULL,
    "hoursAr" TEXT NOT NULL,
    "hoursEn" TEXT NOT NULL,
    "eligibilityAr" TEXT NOT NULL,
    "eligibilityEn" TEXT NOT NULL,
    "sourceAr" TEXT NOT NULL,
    "sourceEn" TEXT NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "searchText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_steps" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,

    CONSTRAINT "service_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_documents" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,

    CONSTRAINT "service_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_notes" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "textAr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,

    CONSTRAINT "service_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_faqs" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "questionAr" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answerAr" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,

    CONSTRAINT "service_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_keywords" (
    "id" SERIAL NOT NULL,
    "serviceId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "service_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_relations" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,

    CONSTRAINT "service_relations_pkey" PRIMARY KEY ("fromId","toId")
);

-- CreateTable
CREATE TABLE "offices" (
    "id" SERIAL NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "departmentAr" TEXT NOT NULL,
    "departmentEn" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "addressAr" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "temporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
    "openDays" INTEGER[],
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,
    "searchText" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_categories" (
    "officeId" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "office_categories_pkey" PRIMARY KEY ("officeId","categoryId")
);

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");

-- CreateIndex
CREATE INDEX "services_popular_idx" ON "services"("popular");

-- CreateIndex
CREATE INDEX "service_steps_serviceId_position_idx" ON "service_steps"("serviceId", "position");

-- CreateIndex
CREATE INDEX "service_documents_serviceId_position_idx" ON "service_documents"("serviceId", "position");

-- CreateIndex
CREATE INDEX "service_notes_serviceId_position_idx" ON "service_notes"("serviceId", "position");

-- CreateIndex
CREATE INDEX "service_faqs_serviceId_position_idx" ON "service_faqs"("serviceId", "position");

-- CreateIndex
CREATE INDEX "service_keywords_keyword_idx" ON "service_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "service_keywords_serviceId_keyword_key" ON "service_keywords"("serviceId", "keyword");

-- CreateIndex
CREATE INDEX "offices_cityId_idx" ON "offices"("cityId");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_steps" ADD CONSTRAINT "service_steps_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_documents" ADD CONSTRAINT "service_documents_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_notes" ADD CONSTRAINT "service_notes_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_faqs" ADD CONSTRAINT "service_faqs_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_keywords" ADD CONSTRAINT "service_keywords_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_relations" ADD CONSTRAINT "service_relations_toId_fkey" FOREIGN KEY ("toId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offices" ADD CONSTRAINT "offices_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_categories" ADD CONSTRAINT "office_categories_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_categories" ADD CONSTRAINT "office_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
