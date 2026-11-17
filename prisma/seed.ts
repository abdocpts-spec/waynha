/**
 * تعبئة قاعدة البيانات من prisma/seed-data.json (بيانات تجريبية نُقلت أصلاً من النموذج الأولي).
 *
 * ⚠️ كل هذه السجلات تُحفظ بـ isDemo = true أي "بيانات تجريبية"، لأن مصدرها
 * النموذج الأولي ولم تُراجع مع الجهات الرسمية (أرقام الهواتف مثلاً أرقام مثال).
 * بعد التحقق من أي خدمة أو جهة، غيّر isDemo إلى false في لوحة الإدارة أو مباشرة
 * في قاعدة البيانات، وعندها يختفي تنبيه "بيانات تجريبية" من الواجهة والمساعد.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { normalizeText } from "../lib/search/normalize.js";

loadEnv({ path: ".env.local", override: true, quiet: true });

const here = path.dirname(fileURLToPath(import.meta.url));

type SeedData = {
  categories: { id: string; icon: string; color: string; titleAr: string; titleEn: string; sortOrder: number }[];
  cities: { id: string; nameAr: string; nameEn: string }[];
  offices: {
    id: number; nameAr: string; nameEn: string; departmentAr: string; departmentEn: string;
    cityId: string; addressAr: string; addressEn: string; phone: string; lat: number; lng: number;
    temporarilyClosed: boolean; openDays: number[]; openTime: string; closeTime: string; categoryIds: string[];
  }[];
  services: {
    id: string; categoryId: string; icon: string; popular: boolean; verified: boolean;
    titleAr: string; titleEn: string; shortDescAr: string; shortDescEn: string;
    departmentAr: string; departmentEn: string; feesAr: string; feesEn: string;
    durationAr: string; durationEn: string; hoursAr: string; hoursEn: string;
    eligibilityAr: string; eligibilityEn: string; sourceAr: string; sourceEn: string;
    lastReviewedAt: string | null;
    audience?: "ALL" | "CITIZEN" | "FOREIGNER";
    steps: { textAr: string; textEn: string }[];
    documents: { textAr: string; textEn: string }[];
    notes: { textAr: string; textEn: string }[];
    faqs: { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[];
    related: string[];
    keywords: string[];
  }[];
};

/** كلمات إضافية باللهجة الليبية لكل خدمة (تُضاف لكلمات النموذج الأولي). */
const EXTRA_KEYWORDS: Record<string, string[]> = {
  "lost-passport": [
    "ضيعت جوازي", "جوازي ضاع", "جواز سفري ضايع", "ضاع الجواز", "بدل فاقد جواز",
    "نبي بدل فاقد", "شن ندير لو الجواز ضاع", "سرقوا جوازي", "lost my passport", "passport replacement",
  ],
  "renew-passport": [
    "جوازي منتهي", "نبي نجدد الجواز", "تجديد الجواز", "جوازي قرب يخلص", "passport renewal",
  ],
  "birth-certificate": [
    "نبي نطلع ورقة ميلاد", "ورقة ميلاد", "مستخرج ميلاد", "شهادة ميلاد جديدة", "وثيقة ميلاد",
    "birth certificate copy",
  ],
  "national-id": [
    "بطاقة شخصية", "رقم وطني", "نبي نطلع بطاقة", "هويتي ضاعت", "بطاقة الهوية", "id card",
  ],
  "family-book": ["كتيب العيلة", "دفتر العائلة", "كتيب عائلة جديد"],
  "renew-license": [
    "رخصتي منتهية", "نبي نجدد رخصة السواقة", "تجديد رخصة سياقة", "رخصة القيادة", "driving licence renewal",
  ],
  "register-vehicle": ["لوحة سيارة", "ترخيص سيارة جديدة", "تسجيل عربية", "نبي نسجل سيارتي"],
  "transfer-ownership": ["بعت سيارتي", "شريت سيارة", "نقل ملكية عربية", "تحويل ملكية سيارة"],
  "register-company": ["نبي نفتح شركة", "تسجيل شركة", "سجل تجاري", "نبي نبدا مشروع"],
  "pension-registration": ["ضمان اجتماعي", "نبي نسجل في التقاعد", "رقم الضمان"],
  "health-card": ["بطاقة صحية", "كرت صحي", "بطاقة علاج"],
  "property-registration": ["تسجيل ارض", "سند ملكية", "تحرير ملكية بيت", "توثيق عقار"],
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL غير موجود. انسخ .env.example إلى .env.local");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const data: SeedData = JSON.parse(readFileSync(path.join(here, "seed-data.json"), "utf8"));

  // نحذف بيانات البذر السابقة فقط (isDemo) حتى لا نمسح أي بيانات موثقة أُضيفت يدوياً
  await prisma.serviceRelation.deleteMany({});
  await prisma.service.deleteMany({ where: { isDemo: true } });
  await prisma.officeCategory.deleteMany({});
  await prisma.office.deleteMany({ where: { isDemo: true } });

  for (const category of data.categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: category,
      create: category,
    });
  }

  for (const city of data.cities) {
    await prisma.city.upsert({ where: { id: city.id }, update: city, create: city });
  }

  for (const service of data.services) {
    const category = data.categories.find((c) => c.id === service.categoryId);
    // التطبيع قد يوحّد كلمتين مختلفتين ("شهادة" و"شهاده")، فنزيل التكرار بعده
    const keywords = [
      ...new Set(
        [...service.keywords, ...(EXTRA_KEYWORDS[service.id] ?? [])]
          .map((keyword) => normalizeText(keyword))
          .filter(Boolean),
      ),
    ];

    const searchText = normalizeText(
      [
        service.titleAr, service.titleEn, service.shortDescAr, service.shortDescEn,
        service.departmentAr, service.departmentEn, category?.titleAr, category?.titleEn,
        ...keywords,
      ].join(" "),
    );

    await prisma.service.create({
      data: {
        id: service.id,
        categoryId: service.categoryId,
        icon: service.icon,
        popular: service.popular,
        verified: service.verified,
        isDemo: true,
        titleAr: service.titleAr,
        titleEn: service.titleEn,
        shortDescAr: service.shortDescAr,
        shortDescEn: service.shortDescEn,
        departmentAr: service.departmentAr,
        departmentEn: service.departmentEn,
        feesAr: service.feesAr,
        feesEn: service.feesEn,
        durationAr: service.durationAr,
        durationEn: service.durationEn,
        hoursAr: service.hoursAr,
        hoursEn: service.hoursEn,
        eligibilityAr: service.eligibilityAr,
        eligibilityEn: service.eligibilityEn,
        sourceAr: service.sourceAr,
        sourceEn: service.sourceEn,
        lastReviewedAt: service.lastReviewedAt ? new Date(service.lastReviewedAt) : null,
        audience: service.audience ?? "ALL",
        status: "PUBLISHED",
        searchText,
        steps: {
          create: service.steps.map((step, index) => ({ position: index, ...step })),
        },
        documents: {
          create: service.documents.map((doc, index) => ({ position: index, ...doc })),
        },
        notes: {
          create: service.notes.map((note, index) => ({ position: index, ...note })),
        },
        faqs: {
          create: service.faqs.map((faq, index) => ({ position: index, ...faq })),
        },
        keywords: {
          create: keywords.map((keyword) => ({ keyword, weight: keyword.includes(" ") ? 5 : 3 })),
        },
      },
    });
  }

  // العلاقات بعد إنشاء كل الخدمات
  const existingIds = new Set((await prisma.service.findMany({ select: { id: true } })).map((s) => s.id));
  for (const service of data.services) {
    for (const relatedId of service.related) {
      if (!existingIds.has(relatedId)) continue;
      await prisma.serviceRelation.upsert({
        where: { fromId_toId: { fromId: service.id, toId: relatedId } },
        update: {},
        create: { fromId: service.id, toId: relatedId },
      });
    }
  }

  for (const office of data.offices) {
    const city = data.cities.find((c) => c.id === office.cityId);
    await prisma.office.create({
      data: {
        id: office.id,
        nameAr: office.nameAr,
        nameEn: office.nameEn,
        departmentAr: office.departmentAr,
        departmentEn: office.departmentEn,
        cityId: office.cityId,
        addressAr: office.addressAr,
        addressEn: office.addressEn,
        phone: office.phone,
        lat: office.lat,
        lng: office.lng,
        temporarilyClosed: office.temporarilyClosed,
        openDays: office.openDays,
        openTime: office.openTime,
        closeTime: office.closeTime,
        isDemo: true,
        searchText: normalizeText(
          [
            office.nameAr, office.nameEn, office.departmentAr, office.departmentEn,
            office.addressAr, office.addressEn, city?.nameAr, city?.nameEn,
          ].join(" "),
        ),
        categories: {
          create: office.categoryIds
            .filter((id) => data.categories.some((c) => c.id === id))
            .map((categoryId) => ({ categoryId })),
        },
        // ربط صريح جهة ↔ خدمة: كل خدمات الأقسام التي تخدمها الجهة (يعدّله الأدمن لاحقاً)
        services: {
          create: data.services
            .filter((svc) => office.categoryIds.includes(svc.categoryId))
            .map((svc) => ({ serviceId: svc.id })),
        },
      },
    });
  }

  // الجهات أُدخلت بمعرّفات صريحة: نُلحق التسلسل بها حتى تعمل إضافة جهة جديدة من لوحة الإدارة
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"offices"', 'id'), COALESCE((SELECT MAX("id") FROM "offices"), 0) + 1, false)`;

  const [services, offices, keywords] = await Promise.all([
    prisma.service.count(),
    prisma.office.count(),
    prisma.serviceKeyword.count(),
  ]);
  console.log(`تمت التعبئة: ${services} خدمة، ${offices} جهة، ${keywords} كلمة بحث (كلها بيانات تجريبية).`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
