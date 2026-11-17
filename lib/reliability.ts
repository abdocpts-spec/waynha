/**
 * مؤشر موثوقية المعلومات.
 *
 * الحالة يحسبها الـ Backend فقط من البيانات المسجّلة (مصادر + مراجعة فعلية من مراجع + مواعيد + بلاغات).
 * لا يمنحها أي تعديل على الخدمة، ولا يقرّرها الذكاء الاصطناعي.
 * «تمت المراجعة» هنا تعني مراجعة فريق وينها للمعلومة، وليست اعتماداً حكومياً رسمياً.
 */

export type ReliabilityStatus = "REVIEWED" | "NEEDS_REVIEW" | "OUTDATED" | "NO_SOURCE";

export type Reason = "no_source" | "never_reviewed" | "edited_after_review" | "status_needs_update" | "open_reports" | "overdue";

type SourceLike = {
  name: string;
  nameEn: string | null;
  type: string;
  url: string | null;
  accessedAt: Date | null;
  linkStatus: string;
};

export type ReliabilityInput = {
  status: string; // ContentStatus
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  reviewIntervalDays: number | null;
  reviewedById: number | null;
  contentEditedAt: Date | null;
  sources: SourceLike[];
  reports: { status: string }[];
  category: { reviewIntervalDays: number };
};

export const DUE_SOON_DAYS = 14;
const DAY = 86_400_000;

export function computeReliability(input: ReliabilityInput, now = new Date()) {
  const reasons: Reason[] = [];
  const interval = input.reviewIntervalDays ?? input.category.reviewIntervalDays;
  const reviewed = Boolean(input.lastReviewedAt && input.reviewedById);
  const dueAt = reviewed
    ? input.nextReviewAt ?? new Date((input.lastReviewedAt as Date).getTime() + interval * DAY)
    : input.nextReviewAt;

  let status: ReliabilityStatus;
  if (input.sources.length === 0) {
    status = "NO_SOURCE";
    reasons.push("no_source");
  } else if (!reviewed) {
    status = "NEEDS_REVIEW";
    reasons.push("never_reviewed");
  } else if (dueAt && dueAt.getTime() < now.getTime()) {
    status = "OUTDATED";
    reasons.push("overdue");
  } else {
    status = "REVIEWED";
    if (input.contentEditedAt && input.lastReviewedAt && input.contentEditedAt.getTime() > input.lastReviewedAt.getTime()) {
      status = "NEEDS_REVIEW";
      reasons.push("edited_after_review");
    }
    if (input.status === "NEEDS_UPDATE") {
      status = "NEEDS_REVIEW";
      reasons.push("status_needs_update");
    }
    // بلاغ واحد جديد غير متحقق منه لا يغيّر الحالة؛ يلزم بلاغان جديدان أو بلاغ قَبِله الأدمن للمراجعة
    const accepted = input.reports.filter((r) => r.status === "IN_REVIEW").length;
    const fresh = input.reports.filter((r) => r.status === "NEW").length;
    if (accepted >= 1 || fresh >= 2) {
      status = "NEEDS_REVIEW";
      reasons.push("open_reports");
    }
  }

  const dueSoon =
    status === "REVIEWED" && dueAt != null && dueAt.getTime() - now.getTime() <= DUE_SOON_DAYS * DAY;
  return { status, reasons, dueAt: dueAt ?? null, dueSoon, reviewed };
}

export const RELIABILITY_META: Record<
  ReliabilityStatus,
  { icon: string; tone: "green" | "amber" | "red" | "gray"; ar: string; en: string; shortAr: string; shortEn: string; descAr: string; descEn: string }
> = {
  REVIEWED: {
    icon: "✅",
    tone: "green",
    ar: "تمت المراجعة بواسطة فريق وينها",
    en: "Reviewed by the WAYNHA team",
    shortAr: "تمت المراجعة",
    shortEn: "Reviewed",
    descAr: "راجع فريق وينها المعلومات ولها مصدر مسجّل. هذا لا يعني اعتماداً حكومياً رسمياً.",
    descEn: "The WAYNHA team reviewed this information and a source is on record. This is not an official government endorsement.",
  },
  NEEDS_REVIEW: {
    icon: "🔍",
    tone: "amber",
    ar: "تحتاج إلى مراجعة",
    en: "Needs review",
    shortAr: "تحتاج مراجعة",
    shortEn: "Needs review",
    descAr: "لم تتم مراجعة هذه المعلومات بشكل كافٍ، أو توجد بلاغات أو تعديلات تستدعي التحقق.",
    descEn: "This information has not been reviewed enough, or reports or edits call for a check.",
  },
  OUTDATED: {
    icon: "⏰",
    tone: "red",
    ar: "معلومات قديمة",
    en: "Outdated information",
    shortAr: "معلومات قديمة",
    shortEn: "Outdated",
    descAr: "تجاوزت المعلومات موعد المراجعة المحدد من الإدارة، وقد تكون تغيّرت.",
    descEn: "The review date set by the admins has passed, so the details may have changed.",
  },
  NO_SOURCE: {
    icon: "❔",
    tone: "gray",
    ar: "مصدر غير متوفر",
    en: "Source not available",
    shortAr: "مصدر غير متوفر",
    shortEn: "No source",
    descAr: "لا يوجد مصدر واضح مسجّل لهذه المعلومات، لذلك لا تُعرض كمعلومات تمت مراجعتها.",
    descEn: "No clear source is recorded for this information, so it is not shown as reviewed.",
  },
};

export const SOURCE_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  OFFICIAL_WEBSITE: { ar: "موقع رسمي للجهة", en: "Official website" },
  OFFICIAL_DOCUMENT: { ar: "وثيقة أو قرار رسمي", en: "Official document" },
  OFFICE_VISIT: { ar: "زيارة ميدانية للجهة", en: "Visit to the office" },
  PHONE_CALL: { ar: "اتصال بالجهة", en: "Call to the office" },
  ANNOUNCEMENT: { ar: "إعلان منشور", en: "Published announcement" },
  OTHER: { ar: "مصدر آخر", en: "Other source" },
};

export const LIMITS_NOTE = {
  ar: "وينها منصة إرشادية مستقلة وليست جهة حكومية رسمية. يُنصح بالتأكد من الجهة المختصة قبل إتمام الإجراء.",
  en: "WAYNHA is an independent guidance platform, not an official government body. Please confirm with the competent authority before completing the procedure.",
};

export const OUTDATED_NOTE = {
  ar: "تنبيه: المعلومات المتعلقة بهذه الخدمة قد تحتاج إلى تحديث. يُنصح بالتأكد من الجهة المختصة.",
  en: "Notice: the information about this service may need updating. Please confirm with the competent authority.",
};

/** ما يصل للمتصفح (وللمساعد): لا أسماء مراجعين ولا ملاحظات إدارية. */
export type ReliabilityPayload = {
  status: ReliabilityStatus;
  reasons: Reason[];
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  sources: { name: string; type: string; url: string | null; accessedAt: string | null }[];
};

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** الرابط يُعرض فقط إن كان http/https صالحاً ولم يثبت أنه لا يعمل. وجوده لا يعني صحة المعلومة. */
export function publicUrl(source: Pick<SourceLike, "url" | "linkStatus">): string | null {
  if (!source.url || source.linkStatus === "BROKEN") return null;
  try {
    const u = new URL(source.url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function toReliabilityPayload(input: ReliabilityInput, lang: "ar" | "en"): ReliabilityPayload {
  const r = computeReliability(input);
  return {
    status: r.status,
    reasons: r.reasons,
    lastReviewedAt: r.reviewed ? isoDate(input.lastReviewedAt) : null,
    nextReviewAt: r.reviewed ? isoDate(r.dueAt) : null,
    sources: input.sources.map((s) => ({
      name: lang === "en" && s.nameEn ? s.nameEn : s.name,
      type: SOURCE_TYPE_LABEL[s.type]?.[lang] ?? SOURCE_TYPE_LABEL.OTHER[lang],
      url: publicUrl(s),
      accessedAt: isoDate(s.accessedAt),
    })),
  };
}
