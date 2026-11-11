import { contentWords, normalizeText } from "@/lib/search/normalize";
import type { ServiceMatch } from "@/lib/search/serviceSearch";

export type QuickReply = {
  /** النص الظاهر للمستخدم */
  label: string;
  /** ما يُرسل للمساعد عند الضغط */
  message: string;
};

export type Clarification = {
  question: string;
  options: QuickReply[];
};

type Topic = {
  /** كلمات تدل على الموضوع العام (جواز، رخصة، شهادة...) */
  subject: string[];
  /** كلمات تحدد المطلوب بالضبط */
  actions: string[];
  questionAr: string;
  questionEn: string;
  options: { ar: string; en: string; messageAr: string; messageEn: string }[];
};

/**
 * مواضيع عامة يسأل عنها الناس بكلمة واحدة ("نبي جواز").
 * بدل التخمين، نسأل المستخدم سؤال توضيحي مع أزرار سريعة.
 */
const TOPICS: Topic[] = [
  {
    subject: ["جواز", "passport"],
    actions: ["تجديد", "فقدان", "ضاع", "استخراج", "بدل", "منتهي", "renew", "lost", "issue"],
    questionAr: "أكيد. شن تبي بالضبط في موضوع الجواز؟",
    questionEn: "Sure. What exactly do you need for your passport?",
    options: [
      { ar: "جواز جديد", en: "New passport", messageAr: "استخراج جواز سفر جديد", messageEn: "issue a new passport" },
      { ar: "تجديد جواز", en: "Renew passport", messageAr: "تجديد جواز السفر", messageEn: "renew passport" },
      { ar: "بدل فاقد", en: "Lost passport", messageAr: "فقدان جواز السفر بدل فاقد", messageEn: "lost passport replacement" },
      { ar: "جواز لطفل", en: "Child passport", messageAr: "استخراج جواز سفر لطفل", messageEn: "passport for a child" },
    ],
  },
  {
    subject: ["رخصه", "قياده", "license"],
    actions: ["تجديد", "استخراج", "فقدان", "جديد", "renew", "issue", "lost"],
    questionAr: "تمام. شن تبي في موضوع الرخصة؟",
    questionEn: "Got it. What do you need for the license?",
    options: [
      { ar: "تجديد رخصة القيادة", en: "Renew driving license", messageAr: "تجديد رخصة القيادة", messageEn: "renew driving license" },
      { ar: "تسجيل مركبة", en: "Register a vehicle", messageAr: "تسجيل مركبة جديدة", messageEn: "register a new vehicle" },
      { ar: "نقل ملكية", en: "Transfer ownership", messageAr: "نقل ملكية مركبة", messageEn: "vehicle ownership transfer" },
    ],
  },
  {
    subject: ["شهاده", "وثيقه"],
    actions: ["ميلاد", "وفاه", "زواج", "صحيه", "birth", "death", "marriage"],
    questionAr: "شن نوع الشهادة اللي تبيها؟",
    questionEn: "Which certificate do you need?",
    options: [
      { ar: "شهادة ميلاد", en: "Birth certificate", messageAr: "استخراج شهادة ميلاد", messageEn: "birth certificate" },
      { ar: "بطاقة هوية", en: "National ID", messageAr: "استخراج بطاقة الهوية الوطنية", messageEn: "national id card" },
      { ar: "كتيب العائلة", en: "Family book", messageAr: "استخراج كتيب العائلة", messageEn: "family book" },
    ],
  },
];

/**
 * هل نحتاج سؤال توضيحي؟ نعم إذا ذكر المستخدم موضوعاً عاماً بدون تحديد،
 * أو إذا كانت نتائج البحث متقاربة ولا واحدة منها تغطي السؤال كاملاً.
 */
export function buildClarification(
  query: string,
  matches: ServiceMatch<{ icon: string; titleAr: string; titleEn: string }>[],
  lang: "ar" | "en",
): Clarification | null {
  const normalized = normalizeText(query);
  const words = contentWords(query);

  for (const topic of TOPICS) {
    const mentionsSubject = topic.subject.some((s) => normalized.includes(normalizeText(s)));
    const mentionsAction = topic.actions.some((a) => normalized.includes(normalizeText(a)));
    if (mentionsSubject && !mentionsAction) {
      return {
        question: lang === "ar" ? topic.questionAr : topic.questionEn,
        options: topic.options.map((option) => ({
          label: lang === "ar" ? option.ar : option.en,
          message: lang === "ar" ? option.messageAr : option.messageEn,
        })),
      };
    }
  }

  // نتائج متقاربة: نعرضها كخيارات بدل اختيار واحدة بالتخمين
  const close = matches.filter((m) => matches[0] && m.score >= matches[0].score * 0.7).slice(0, 4);
  if (words.length > 0 && close.length > 1 && !close[0].complete) {
    return {
      question:
        lang === "ar"
          ? "ممكن توضحلي أكثر؟ هذي أقرب الخدمات لسؤالك:"
          : "Could you be more specific? These services look closest:",
      options: close.map((m) => ({
        label: `${m.service.icon} ${lang === "ar" ? m.service.titleAr : m.service.titleEn}`,
        message: lang === "ar" ? m.service.titleAr : m.service.titleEn,
      })),
    };
  }

  return null;
}
