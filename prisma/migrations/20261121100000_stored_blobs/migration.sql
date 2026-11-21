-- محتوى الملفات المرفوعة داخل قاعدة البيانات (للاستضافة السحابية بلا قرص دائم)
CREATE TABLE "stored_blobs" (
    "storedName" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_blobs_pkey" PRIMARY KEY ("storedName")
);
