/**
 * تحديث خدمة «استخراج بطاقة الهوية الوطنية» بقائمة الأوراق المنشورة (بدل البيانات التجريبية).
 *
 *   npx tsx scripts/update-national-id.mts
 *
 * - تحدّث الخدمة في مكانها (لا تحذفها) حتى لا تضيع الخدمات المحفوظة ومتابعات المستخدمين وربط الجهات.
 * - كل قيمة غير مذكورة في المصدر (الرسوم، المدة، الدوام القديم، مدة التجديد...) أُزيلت بدل الإبقاء على قيم تجريبية.
 * - لا تسجّل «مراجعة»: تبقى الحالة «تحتاج مراجعة» حتى يراجعها أدمن.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { normalizeText } from "../lib/search/normalize.js";

loadEnv({ path: ".env.local", override: true, quiet: true });

const ID = "national-id";

const documents: [string, string][] = [
  ["نموذج + شهادة ميلاد بالرقم الوطني (إصدار جديد 2025م).", "Application form + birth certificate showing the national ID number (new 2025 issue)."],
  ["شهادة بالوضع العائلي (إصدار 2025م).", "Family status certificate (2025 issue)."],
  ["شهادة بالإقامة الفعلية من شيخ المحلة.", "Certificate of actual residence from the local neighbourhood sheikh."],
  ["رسالة من جهة العمل، أو تعريف طالب، أو رسالة من القوة العاملة في حالة العمل الحر أو ربة البيت.", "A letter from the employer, a student ID letter, or a Labour Force letter for the self-employed or homemakers."],
  ["فصيلة الدم + عدد (4) صور شخصية.", "Blood group + four (4) personal photos."],
  ["صورة من شهادة ميلاد الأب من كتيب العائلة + شهادة المعني.", "A copy of the father's birth certificate from the Family Book + the applicant's certificate."],
  ["صورة من جواز السفر (إن وجد) — الرقم الآلي.", "A copy of the passport (if any) — the machine-readable number."],
  ["صورة من الجنسية في حالة كان الوالد مولود خارج ليبيا.", "A copy of the nationality certificate if the father was born outside Libya."],
  ["صورة من الجنسية للمولود خارج ليبيا.", "A copy of the nationality certificate for those born outside Libya."],
];

const steps: [string, string][] = [
  ["جهّز الأوراق المطلوبة كاملة (حسب حالتك: أول مرة، تجديد، بدل تالف أو بدل فاقد).", "Prepare all the required papers (depending on your case: first issue, renewal, damaged or lost replacement)."],
  ["احضر بنفسك يوم الاثنين لتقديم الطلب؛ لا تُقبل المعاملة إلا بحضور صاحب الطلب شخصياً.", "Come in person on Monday to submit the application; the application is only accepted with the applicant present."],
];

const notes: [string, string][] = [
  ["تُقبل المعاملات يوم الاثنين فقط من كل أسبوع.", "Applications are accepted on Mondays only, each week."],
  ["لا يتم قبول المعاملة إلا بحضور شخصي لصاحب الطلب.", "The application is not accepted unless the applicant attends in person."],
  ["القائمة تشمل: أول مرة، تجديد، بدل تالف، بدل فاقد.", "The list covers: first issue, renewal, damaged replacement, lost replacement."],
  ["مصدر هذه القائمة منشور متداول لم تُحدَّد فيه الجهة الناشرة ولا العنوان؛ تأكد من مكتب السجل المدني التابع لك.", "This list comes from a circulated post that does not name the issuing office or address; confirm with your own Civil Registry office."],
];

const keywords = [
  "هوية", "بطاقة هوية", "رقم وطني", "national id", "بطاقة شخصية", "هويتي", "هويتي انتهت", "هوية وطنية",
  "بدل فاقد بطاقة", "بدل تالف بطاقة", "تجديد البطاقة الشخصية", "نبي نطلع بطاقة", "اوراق البطاقة الشخصية", "id card",
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL غير موجود. انسخ .env.example إلى .env.local");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const existing = await prisma.service.findUnique({ where: { id: ID }, select: { id: true } });
  if (!existing) throw new Error(`الخدمة ${ID} غير موجودة`);

  const normalized = [...new Set(keywords.map((k) => normalizeText(k)).filter(Boolean))];
  const title = "استخراج بطاقة الهوية الوطنية (البطاقة الشخصية)";
  const titleEn = "National ID Card (first issue, renewal, replacement)";
  const shortAr = "الأوراق المطلوبة لاستخراج البطاقة الشخصية: أول مرة، تجديد، بدل تالف، بدل فاقد.";
  const shortEn = "Papers required for the personal ID card: first issue, renewal, damaged or lost replacement.";
  const dept = "مصلحة الأحوال المدنية (السجل المدني)";
  const deptEn = "Civil Registry Authority";
  const none = "غير مذكورة في المصدر — اسأل المكتب";
  const noneEn = "Not stated in the source — ask the office";

  await prisma.$transaction([
    prisma.serviceStep.deleteMany({ where: { serviceId: ID } }),
    prisma.serviceDocument.deleteMany({ where: { serviceId: ID } }),
    prisma.serviceNote.deleteMany({ where: { serviceId: ID } }),
    prisma.serviceKeyword.deleteMany({ where: { serviceId: ID } }),
    prisma.serviceSource.deleteMany({ where: { serviceId: ID } }),
    prisma.service.update({
      where: { id: ID },
      data: {
        isDemo: false,
        verified: false,
        titleAr: title,
        titleEn,
        shortDescAr: shortAr,
        shortDescEn: shortEn,
        departmentAr: dept,
        departmentEn: deptEn,
        feesAr: none,
        feesEn: noneEn,
        durationAr: none,
        durationEn: noneEn,
        hoursAr: "قبول المعاملات: الاثنين فقط",
        hoursEn: "Applications: Mondays only",
        eligibilityAr: "المواطنون الليبيون",
        eligibilityEn: "Libyan citizens",
        sourceAr: "قائمة الأوراق المطلوبة لاستخراج البطاقة الشخصية (منشور، الجهة الناشرة غير محددة)",
        sourceEn: "List of papers required for the personal ID card (circulated post, issuer not stated)",
        lastReviewedAt: null,
        reviewedById: null,
        contentEditedAt: new Date(),
        status: "PUBLISHED",
        searchText: normalizeText([title, titleEn, shortAr, shortEn, dept, deptEn, ...normalized].join(" ")),
        steps: { create: steps.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
        documents: { create: documents.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
        notes: { create: notes.map(([textAr, textEn], position) => ({ position, textAr, textEn })) },
        keywords: { create: normalized.map((keyword) => ({ keyword, weight: keyword.includes(" ") ? 5 : 3 })) },
        sources: {
          create: {
            name: "قائمة «الأوراق المطلوبة لاستخراج البطاقة الشخصية» (منشور متداول)",
            nameEn: "“Papers required for the personal ID card” (circulated post)",
            type: "ANNOUNCEMENT",
            accessedAt: new Date(),
            note: "صورة منشور بدون اسم الجهة الناشرة أو تاريخ أو رابط. يحتاج مراجعة فعلية وتأكيداً من السجل المدني.",
          },
        },
      },
    }),
  ]);
  console.log(`تم تحديث الخدمة ${ID}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
