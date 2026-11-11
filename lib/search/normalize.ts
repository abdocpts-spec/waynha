/**
 * تطبيع النص العربي + قاموس اللهجة الليبية.
 * يُستخدم في بحث الخدمات وفي بناء فهرس البحث عند التعبئة (seed).
 */

const DIACRITICS = /[ً-ٰٟـ]/g;

/** توحيد شكل الكتابة: أ/إ/آ → ا، ة → ه، ى → ي، وإزالة التشكيل وعلامات الترقيم. */
export function normalizeText(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** كلمات لا تميّز خدمة بعينها، فلا تُحتسب في تغطية السؤال. */
export const STOPWORDS = new Set([
  "في", "من", "علي", "عن", "الي", "كيف", "شن", "شنو", "وش", "نبي", "نبغي", "ابي", "ابغي",
  "بدي", "اريد", "انا", "هل", "ما", "ماذا", "لو", "يا", "اللي", "متاع", "بش", "باش", "ندير",
  "نعمل", "نسوي", "نحتاج", "احتاج", "لازم", "يلزم", "اجراء", "اجراءات", "خطوات", "طريقه", "معامله", "نفتح", "نبدا", "جديد", "جديده",
  "مني", "لي", "عندي", "متاعي", "هذا", "هذي", "توا", "خوي",
  "the", "a", "an", "to", "how", "do", "i", "my", "of", "for", "is", "want", "need", "what",
  "can", "procedure", "procedures", "steps", "get", "apply", "open", "new", "please",
]);

/**
 * مرادفات اللهجة الليبية: كل كلمة تُضاف لها صيغتها القياسية قبل البحث،
 * حتى يلقى "ضيعت جوازي" و"جواز سفري ضايع" نفس الخدمة.
 */
const DIALECT_SYNONYMS: Record<string, string[]> = {
  // فقدان
  ضيعت: ["فقدان", "ضاع"],
  ضايع: ["فقدان", "ضاع"],
  ضاع: ["فقدان"],
  ضياع: ["فقدان"],
  ريحته: ["فقدان", "ضاع"],
  ريحت: ["فقدان", "ضاع"],
  مفقود: ["فقدان"],
  فقدت: ["فقدان"],
  فاقد: ["فقدان", "بدل"],
  lost: ["فقدان"],
  // استخراج
  نطلع: ["استخراج"],
  طلعت: ["استخراج"],
  مستخرج: ["استخراج"],
  نستخرج: ["استخراج"],
  ورقه: ["شهاده", "وثيقه"],
  وثيقه: ["شهاده"],
  issue: ["استخراج"],
  // تجديد
  نجدد: ["تجديد"],
  جددت: ["تجديد"],
  انتهي: ["تجديد", "منتهي"],
  منتهي: ["تجديد"],
  خلص: ["تجديد", "منتهي"],
  منتهيه: ["منتهي", "تجديد"],
  renew: ["تجديد"],
  renewal: ["تجديد"],
  expired: ["تجديد", "منتهي"],
  // وثائق ومسميات
  جوازي: ["جواز"],
  جوازات: ["جواز"],
  passport: ["جواز"],
  هويتي: ["هويه"],
  بطاقتي: ["بطاقه"],
  رخصتي: ["رخصه"],
  license: ["رخصه"],
  driving: ["قياده", "رخصه"],
  سياره: ["مركبه"],
  سيارتي: ["مركبه"],
  عربيه: ["مركبه"],
  vehicle: ["مركبه"],
  car: ["مركبه"],
  birth: ["ميلاد"],
  certificate: ["شهاده"],
  id: ["هويه"],
  national: ["وطني"],
  company: ["شركه"],
  business: ["شركه"],
  property: ["عقار"],
  health: ["صحيه"],
  // أماكن
  وين: ["مكان"],
  اقرب: ["مكان"],
  مكتب: ["مكان", "جهه"],
  فرع: ["مكان", "جهه"],
  where: ["مكان"],
  nearest: ["مكان"],
  office: ["مكان", "جهه"],
};

/** كلمات تدل على أن المستخدم يسأل عن مكان وليس عن خطوات. */
export const LOCATION_WORDS = [
  "وين", "اقرب", "مكتب", "فرع", "عنوان", "مكان", "خريطه",
  "where", "nearest", "office", "branch", "address", "location", "map",
];

/**
 * صيغ الكلمة الواحدة: بعد إزالة السوابق (ال، ولل، بـ، لـ) واللواحق (ـه، ـها، ـي)
 * ومعها مرادفات اللهجة. مثال: "لتجديد" → [لتجديد، تجديد]، "نجدده" → [نجدده، نجدد، تجديد].
 */
export function expandWord(word: string): string[] {
  const variants = new Set<string>([word]);

  const stripPrefixes = (w: string) => {
    let out = w;
    if (out.length >= 5 && /^[ولبكف]ال/.test(out)) out = out.slice(3);
    else if (out.length >= 5 && out.startsWith("ال")) out = out.slice(2);
    else if (out.length >= 5 && /^[ولبكف]/.test(out)) out = out.slice(1);
    return out;
  };

  const stripSuffixes = (w: string) => {
    if (w.length >= 6 && /(ها|هم|كم|ات|ين)$/.test(w)) return w.slice(0, -2);
    if (w.length >= 5 && /[هيك]$/.test(w)) return w.slice(0, -1);
    return w;
  };

  const stripped = stripPrefixes(word);
  variants.add(stripped);
  variants.add(stripSuffixes(word));
  variants.add(stripSuffixes(stripped));

  for (const variant of [...variants]) {
    for (const synonym of DIALECT_SYNONYMS[variant] ?? []) variants.add(synonym);
  }

  return [...variants].filter((v) => v.length >= 2);
}

/** الكلمات الأصلية بدون مرادفات — تُستخدم لقياس تغطية السؤال. */
export function contentWords(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !STOPWORDS.has(expandWord(w)[1] ?? w));
}

/** كل كلمة مفيدة في السؤال مع صيغها المختلفة. */
export function tokenizeDetailed(query: string): { word: string; variants: string[] }[] {
  return contentWords(query).map((word) => ({ word, variants: expandWord(word) }));
}

/** كل الصيغ مجتمعة — تُستخدم في ترشيح SQL. */
export function tokenize(query: string): string[] {
  return [...new Set(tokenizeDetailed(query).flatMap((t) => t.variants))];
}

/** هل يسأل المستخدم عن موقع جهة؟ */
export function asksAboutLocation(query: string): boolean {
  const normalized = normalizeText(query);
  return LOCATION_WORDS.some((word) => normalized.includes(normalizeText(word)));
}

/** تخمين لغة السؤال من الحروف المستخدمة. */
export function detectLanguage(query: string): "ar" | "en" {
  const arabic = (query.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (query.match(/[a-z]/gi) ?? []).length;
  return arabic >= latin ? "ar" : "en";
}
