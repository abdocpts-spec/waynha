/** تسميات مراحل الاعتماد والبلاغات والأدوار في لوحة الإدارة. */

export const SERVICE_STATUS = {
  DRAFT: { label: "مسودة", tone: "gray", hint: "غير ظاهرة للزوار" },
  IN_REVIEW: { label: "قيد المراجعة", tone: "amber", hint: "يتحقق الفريق من المصدر الرسمي" },
  PUBLISHED: { label: "معتمدة ومنشورة", tone: "green", hint: "ظاهرة مع «راجعها فريق وينها»" },
  NEEDS_UPDATE: { label: "تحتاج تحديث", tone: "red", hint: "ظاهرة مع تنبيه للزوار" },
} as const;

/** الانتقالات المسموحة بين المراحل (زر لكل انتقال). */
export const SERVICE_TRANSITIONS: Record<keyof typeof SERVICE_STATUS, { to: keyof typeof SERVICE_STATUS; label: string }[]> = {
  DRAFT: [{ to: "IN_REVIEW", label: "إرسال للمراجعة" }],
  IN_REVIEW: [
    { to: "PUBLISHED", label: "اعتماد ونشر ✓" },
    { to: "DRAFT", label: "إرجاع لمسودة" },
  ],
  PUBLISHED: [
    { to: "NEEDS_UPDATE", label: "تحتاج تحديث" },
    { to: "DRAFT", label: "إيقاف النشر" },
  ],
  NEEDS_UPDATE: [
    { to: "PUBLISHED", label: "تم التحديث، اعتماد ✓" },
    { to: "IN_REVIEW", label: "مراجعة كاملة" },
  ],
};

export const AUDIENCE = {
  ALL: "الكل",
  CITIZEN: "المواطن",
  FOREIGNER: "الأجنبي",
} as const;

export const REPORT_STATUS = {
  NEW: { label: "جديد", tone: "amber" },
  IN_REVIEW: { label: "قيد المراجعة", tone: "blue" },
  RESOLVED: { label: "مقبول وتم التصحيح", tone: "green" },
  REJECTED: { label: "مرفوض", tone: "gray" },
} as const;

export const REPORT_TRANSITIONS: Record<keyof typeof REPORT_STATUS, { to: keyof typeof REPORT_STATUS; label: string }[]> = {
  NEW: [
    { to: "IN_REVIEW", label: "قبول للمراجعة" },
    { to: "REJECTED", label: "رفض" },
  ],
  IN_REVIEW: [
    { to: "RESOLVED", label: "تم التصحيح ✓" },
    { to: "REJECTED", label: "رفض" },
  ],
  RESOLVED: [{ to: "IN_REVIEW", label: "إعادة فتح" }],
  REJECTED: [{ to: "IN_REVIEW", label: "إعادة فتح" }],
};

export const REPORT_KIND = {
  PHONE: "رقم الهاتف",
  LOCATION: "الموقع",
  OUTDATED: "معلومة قديمة",
  MISSING: "معلومة ناقصة",
  OTHER: "أخرى",
} as const;

export const ROLE = {
  CITIZEN: "مواطن",
  FOREIGNER: "أجنبي",
  ADMIN: "أدمن",
} as const;
