import {
  detectFocus,
  toOfficePayload,
  toServicePayload,
  type Focus,
  type Lang,
} from "@/lib/ai/contextBuilder";
import type { ChatTurn } from "@/lib/ai/chatTypes";
import { buildClarification, type QuickReply } from "@/lib/search/clarify";
import { asksAboutLocation } from "@/lib/search/normalize";
import {
  confidentMatch,
  getServiceCached,
  listOfficesCached,
  officesForCategoryCached,
  searchServiceSummaries,
  type ServiceMatch,
  type ServiceSummary,
} from "@/lib/search/serviceSearch";

/** كم رسالة سابقة للمستخدم نرجع لها لنفهم أسئلة المتابعة ("شن الأوراق المطلوبة؟") */
const FOLLOW_UP_LOOKBACK = 3;
/** أسئلة عن جزء من الخدمة الحالية (مستندات، رسوم، مكان...) */
const FOLLOW_UP_FOCUS = new Set<Focus>(["documents", "fees", "duration", "hours", "eligibility", "location"]);

/**
 * الاسترجاع (RAG) بدون Gemini: بحث PostgreSQL على السؤال نفسه وعلى سياق المحادثة
 * بالتوازي، ثم جلب تفاصيل الخدمة المختارة وحدها وجهاتها.
 */
export async function retrieve(message: string, conversation: ChatTurn[], lang: Lang) {
  const wantsLocation = asksAboutLocation(message);

  // موضوع عام بدون تحديد ("نبي جواز"): نسأل للتوضيح بدل التخمين
  const topicClarification = buildClarification(message, [], lang);

  const previousUser = conversation
    .filter((turn) => turn.role === "user")
    .slice(-FOLLOW_UP_LOOKBACK)
    .reverse()
    .map((turn) => turn.content);

  let matches: ServiceMatch<ServiceSummary>[] = [];
  let confident: ServiceMatch<ServiceSummary> | null = null;
  let fromConversation = false;

  if (!topicClarification) {
    // كل البحوث مستقلة → نشغلها معاً بدل واحد ورا الثاني
    const [own, combined, ...previous] = await Promise.all([
      searchServiceSummaries(message),
      previousUser[0] ? searchServiceSummaries(`${previousUser[0]} ${message}`) : Promise.resolve([]),
      ...previousUser.map((content) => searchServiceSummaries(content)),
    ]);

    matches = own;
    confident = confidentMatch(own);

    // رد على سؤال توضيحي: "نبي جواز" ثم "ضاع مني"
    if (!confident) {
      const best = confidentMatch(combined);
      if (best) {
        confident = best;
        matches = combined;
      } else if (matches.length === 0) {
        matches = combined;
      }
    }

    // سؤال متابعة ("اشرحلي أبسط"، "شن الأوراق المطلوبة؟"، "وين أقرب جهة؟"):
    // لا يذكر خدمة بعينها، فنرجع لآخر خدمة واضحة في المحادثة
    const isFollowUp =
      own.length === 0 || (!own.some((m) => m.complete) && [...detectFocus(message)].some((f) => FOLLOW_UP_FOCUS.has(f)));
    if (!confident && isFollowUp) {
      for (const found of previous) {
        const best = confidentMatch(found);
        if (best) {
          confident = best;
          matches = found;
          fromConversation = true;
          break;
        }
      }
    }
  }

  const clarification = confident
    ? null
    : topicClarification ?? buildClarification(message, matches, lang);

  const [details, officeRecords] = await Promise.all([
    confident ? getServiceCached(confident.service.id) : Promise.resolve(null),
    confident
      ? officesForCategoryCached(confident.service.categoryId)
      : wantsLocation
        ? listOfficesCached()
        : Promise.resolve([]),
  ]);

  const matchedService = details ? toServicePayload(details, lang) : null;

  return {
    matchedService,
    fromConversation,
    offices: officeRecords.map((office) => toOfficePayload(office, lang)),
    alternatives: matches.filter((m) => m.service.id !== confident?.service.id).slice(0, 3),
    clarification,
    wantsLocation,
    requiresClarification: Boolean(clarification),
    quickReplies:
      clarification && clarification.options.length > 0
        ? clarification.options
        : defaultQuickReplies(lang, Boolean(matchedService)),
  };
}

export function defaultQuickReplies(lang: Lang, hasService: boolean): QuickReply[] {
  if (hasService) {
    return lang === "ar"
      ? [
          { label: "📄 شن المستندات المطلوبة؟", message: "شن المستندات المطلوبة؟" },
          { label: "💰 شن الرسوم؟", message: "شن الرسوم؟" },
          { label: "📍 وين أقرب جهة؟", message: "وين أقرب جهة؟" },
          { label: "🙂 اشرحلي بطريقة أبسط", message: "اشرحلي بطريقة أبسط" },
        ]
      : [
          { label: "📄 What documents do I need?", message: "What documents do I need?" },
          { label: "💰 What are the fees?", message: "What are the fees?" },
          { label: "📍 Where is the nearest office?", message: "Where is the nearest office?" },
          { label: "🙂 Explain it more simply", message: "Explain it more simply" },
        ];
  }
  return lang === "ar"
    ? [
        { label: "ضاع جوازي", message: "ضاع جوازي" },
        { label: "شن نحتاج لتجديد الرخصة؟", message: "شن نحتاج لتجديد الرخصة؟" },
        { label: "نبي شهادة ميلاد", message: "نبي شهادة ميلاد" },
        { label: "وين أقرب جهة؟", message: "وين أقرب جهة؟" },
      ]
    : [
        { label: "I lost my passport", message: "I lost my passport" },
        { label: "How do I renew my license?", message: "How do I renew my license?" },
        { label: "I need a birth certificate", message: "I need a birth certificate" },
        { label: "Where is the nearest office?", message: "Where is the nearest office?" },
      ];
}
