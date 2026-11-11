import { normalizeText } from "@/lib/search/normalize";

/**
 * تصنيف محلي سريع للرسالة (بدون طلب Gemini منفصل).
 *
 * الهدف فقط: معرفة الأسئلة العامة الواضحة ("من انت"، "شن تقدر تدير؟"، التحيات)
 * حتى لا نبحث في قاعدة البيانات بدون داعٍ. أي رسالة أخرى تمر على بحث PostgreSQL،
 * وGemini نفسه يقرر في نفس الطلب كيف يرد إذا لم نجد خدمة (سؤال عام، خارج النطاق، إلخ).
 */
export type GeneralCategory = "assistant_info" | "small_talk";

/** عبارات تدل على سؤال عن المساعد أو منصة وينها أو قدراتها */
const ASSISTANT_INFO = [
  "من انت", "منو انت", "شكون انت", "شن انت", "شنو انت", "مين انت", "انت من", "عرف بنفسك", "عرفني بنفسك",
  "شن تقدر", "شنو تقدر", "شن تعرف تدير", "شن تدير", "شنو تدير", "ماذا تستطيع", "شن دورك", "شن خدمتك",
  "كيف تساعد", "كيف تقدر تساعد", "شن تقدر تساعد", "في شن تساعد", "بشن تساعد",
  "شن هو وينها", "شن هي وينها", "شنو وينها", "ما هو وينها", "ما هي وينها", "شن وينها",
  "who are you", "what are you", "what can you do", "how can you help", "what is waynha", "introduce yourself",
].map(normalizeText);

/** تحيات وشكر ووداع — تُعتبر "دردشة" فقط إذا لم يبقَ في الرسالة أي طلب آخر */
const SMALL_TALK = [
  "السلام عليكم ورحمه الله وبركاته", "السلام عليكم", "وعليكم السلام", "صباح الخير", "مساء الخير",
  "مرحبا", "مرحبتين", "اهلا وسهلا", "اهلا", "هلا", "هاي", "سلام",
  "شكرا جزيلا", "شكرا", "مشكور", "يعطيك العافيه", "تسلم", "بارك الله فيك", "ربي يحفظك",
  "باهي", "تمام", "اوكي", "مع السلامه", "في امان الله", "كيف حالك", "كيف الحال", "شن احوالك", "شن الجو",
  "good morning", "good evening", "thank you", "thanks", "hello", "hey", "hi", "bye", "ok", "okay",
].map(normalizeText);

/** كلمات نداء لا تغيّر معنى التحية ("شكرا يا خوي") */
const FILLER = new Set(["يا", "خوي", "خويا", "اختي", "صاحبي", "وينها", "مساعد", "المساعد", "هلبا", "واجد", "برشا"]);

const MAX_GENERAL_WORDS = 7;

export function classifyGeneral(message: string): GeneralCategory | null {
  const normalized = normalizeText(message);
  if (!normalized) return null;
  const wordCount = normalized.split(" ").length;
  const padded = ` ${normalized} `;

  // بداية كلمة فقط، حتى تطابق "كيف تساعد" كلمة "تساعدني"
  if (wordCount <= MAX_GENERAL_WORDS && ASSISTANT_INFO.some((phrase) => padded.includes(` ${phrase}`))) {
    return "assistant_info";
  }

  // نحذف عبارات التحية؛ إذا لم يبقَ شيء فهي دردشة فقط ("السلام عليكم")،
  // أما "السلام عليكم ضاع جوازي" فتكمل للبحث
  let rest = padded;
  for (const phrase of SMALL_TALK) rest = rest.split(` ${phrase} `).join(" ");
  const leftover = rest.split(" ").filter((word) => word && !FILLER.has(word));
  if (leftover.length === 0) return "small_talk";

  return null;
}
