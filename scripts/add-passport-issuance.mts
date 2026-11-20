/**
 * إضافة خدمة «استخراج جواز السفر الليبي» من إعلان رسمي لقسم جوازات الدافنية - مصراتة.
 * (بيانات حقيقية وليست تجريبية: isDemo = false)
 *
 *   npx tsx scripts/add-passport-issuance.mts
 *
 * - آمنة للتكرار: تحذف الخدمة بنفس المعرّف ثم تنشئها.
 * - لا تسجّل «مراجعة»: حالة الموثوقية تبقى «تحتاج مراجعة» حتى يراجعها أدمن من لوحة الإدارة.
 * - لا تخترع شيئاً غير مذكور في الإعلان (الرسوم والمدة غير مذكورتين فتُكتبان كذلك).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { normalizeText } from "../lib/search/normalize.js";

loadEnv({ path: ".env.local", override: true, quiet: true });

const ID = "issue-passport";

const documents: [string, string][] = [
  ["شهادة ميلاد + شهادة وضع عائلي + شهادة إقامة (من السجل المدني) + أوراق حديثة 2026.", "Birth certificate + family status certificate + residence certificate (from the Civil Registry) — recent 2026 papers."],
  ["عدد (2) صور شخصية حديثة بخلفية بيضاء.", "Two (2) recent personal photos on a white background."],
  ["علم وخبر بالإقامة من شيخ المحلة.", "Residence statement from the local neighbourhood sheikh (sheikh al-mahalla)."],
  ["لموظفي الدولة: إفادة من جهة العمل. وللعسكريين: موافقة من الاستخبارات العسكرية.", "State employees: a statement from the employer. Military personnel: approval from Military Intelligence."],
  ["أصحاب الأعمال الحرة: رسالة من القوة العاملة. والطلاب: مستوى دراسي.", "Self-employed: a letter from the Labour Force office. Students: proof of study level."],
  ["كتيب العائلة: صورة صفحة أب الأسرة + صورة صفحة المعني.", "Family Book: a copy of the head of household's page + a copy of the applicant's page."],
  ["صورة من البطاقة الشخصية.", "A copy of the personal ID card."],
  ["إحضار مستند السفر وإرفاق صورة منه.", "Bring the travel document and attach a copy of it."],
  ["للأبناء: إرفاق صورة جواز سفر الأب.", "For children: attach a copy of the father's passport."],
  ["شهادة الجنسية (أصل + صورة).", "Nationality certificate (original + a copy)."],
];

const steps: [string, string][] = [
  ["إحضار جميع المستندات المطلوبة مسبقاً لضمان سرعة الإنجاز.", "Bring all the required documents in advance to speed things up."],
  ["أخذ نموذج جواز السفر رقم (1) من داخل القسم وتعبئته بشكل واضح وكامل.", "Take passport form No. (1) from inside the office and fill it in clearly and completely."],
  ["تسليم جميع المستندات للموظف المختص لمراجعتها.", "Hand all documents to the responsible employee for review."],
];

const notes: [string, string][] = [
  ["يُمنع ارتداء وشاح أبيض أثناء التصوير، وسيُرفض الطلب في حال المخالفة.", "Wearing a white scarf is not allowed during photography; the application will be rejected if this is violated."],
  ["قبول المعاملات يوم الأحد، والتصوير يومَي الثلاثاء والأربعاء.", "Applications are accepted on Sundays; photography is on Tuesdays and Wednesdays."],
  ["هذه المتطلبات من إعلان قسم جوازات الدافنية (مصراتة)، وقد تختلف قليلاً بين الفروع؛ تأكد من فرعك قبل الذهاب.", "These requirements come from the announcement of the Dafniya Passports Section (Misrata) and may differ slightly between branches; check with your branch before going."],
];

const keywords = [
  "استخراج جواز", "جواز جديد", "نبي نطلع جواز", "نبي نطلع جواز سفر", "طلب جواز سفر", "متطلبات جواز السفر",
  "اول جواز", "جواز سفر ليبي", "ورق الجواز", "get passport", "new passport", "issue passport", "passport requirements",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL غير موجود. انسخ .env.example إلى .env.local");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const normalized = [...new Set(keywords.map((k) => normalizeText(k)).filter(Boolean))];
  const title = "استخراج جواز السفر الليبي";
  const titleEn = "Obtaining a Libyan Passport";
  const shortAr = "متطلبات استخراج جواز السفر الليبي حسب إعلان قسم جوازات الدافنية - مصراتة.";
  const shortEn = "Requirements for obtaining a Libyan passport, per the Dafniya Passports Section (Misrata) announcement.";
  const dept = "مصلحة الجوازات والجنسية — قسم جوازات الدافنية (مصراتة)";
  const deptEn = "Passports & Citizenship Authority — Dafniya Passports Section (Misrata)";

  await prisma.service.deleteMany({ where: { id: ID } });
  await prisma.service.create({
    data: {
      id: ID,
      categoryId: "passports",
      icon: "🛂",
      popular: true,
      verified: false,
      isDemo: false,
      titleAr: title,
      titleEn,
      shortDescAr: shortAr,
      shortDescEn: shortEn,
      departmentAr: dept,
      departmentEn: deptEn,
      feesAr: "غير مذكورة في الإعلان — اسأل القسم",
      feesEn: "Not stated in the announcement — ask the office",
      durationAr: "غير مذكورة في الإعلان — اسأل القسم",
      durationEn: "Not stated in the announcement — ask the office",
      hoursAr: "قبول المعاملات: الأحد · التصوير: الثلاثاء والأربعاء",
      hoursEn: "Applications: Sunday · Photography: Tuesday & Wednesday",
      eligibilityAr: "المواطنون الليبيون",
      eligibilityEn: "Libyan citizens",
      sourceAr: "إعلان قسم جوازات الدافنية - مصراتة (مصلحة الجوازات والجنسية)",
      sourceEn: "Announcement of the Dafniya Passports Section, Misrata (Passports & Citizenship Authority)",
      audience: "CITIZEN",
      status: "PUBLISHED",
      searchText: normalizeText([title, titleEn, shortAr, shortEn, dept, deptEn, "جوازات", "passports", ...normalized].join(" ")),
      steps: { create: steps.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
      documents: { create: documents.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
      notes: { create: notes.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
      keywords: { create: normalized.map((keyword) => ({ keyword, weight: keyword.includes(" ") ? 5 : 3 })) },
      sources: {
        create: {
          name: "إعلان «متطلبات استخراج جواز السفر الليبي» — قسم جوازات الدافنية مصراتة",
          nameEn: "Announcement “Requirements for obtaining a Libyan passport” — Dafniya Passports Section, Misrata",
          type: "ANNOUNCEMENT",
          accessedAt: new Date(),
          note: "ملصق إعلاني منشور من القسم (صورة). لم يُسجَّل رابط. يحتاج مراجعة فعلية من الأدمن.",
        },
      },
    },
  });

  const existing = new Set((await prisma.service.findMany({ select: { id: true } })).map((s) => s.id));
  for (const toId of ["renew-passport", "lost-passport", "national-id", "family-book", "birth-certificate"]) {
    if (!existing.has(toId)) continue;
    await prisma.serviceRelation.upsert({
      where: { fromId_toId: { fromId: ID, toId } },
      update: {},
      create: { fromId: ID, toId },
    });
  }
  console.log(`تمت إضافة الخدمة ${ID}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
