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
  DOCUMENTS: "مستندات غير صحيحة",
  STEPS: "خطوات قديمة",
  FEES: "رسوم غير صحيحة",
  HOURS: "ساعات عمل غير صحيحة",
  SOURCE_LINK: "رابط مصدر لا يعمل",
} as const;

/** وزن البلاغ لترتيب أولوية المراجعة: ما يؤثر مباشرة على ما سيحمله المواطن أو يدفعه أعلى. */
export const REPORT_WEIGHT: Record<keyof typeof REPORT_KIND, number> = {
  FEES: 3,
  DOCUMENTS: 3,
  STEPS: 3,
  OUTDATED: 2,
  PHONE: 2,
  LOCATION: 2,
  HOURS: 2,
  MISSING: 1,
  SOURCE_LINK: 1,
  OTHER: 1,
};

export const ROLE = {
  CITIZEN: "مواطن",
  FOREIGNER: "أجنبي",
  ADMIN: "أدمن",
} as const;

export const REASON_LABEL = {
  no_source: "لا يوجد مصدر مسجّل",
  never_reviewed: "لم تُسجَّل لها مراجعة فعلية",
  edited_after_review: "عُدّلت بعد آخر مراجعة",
  status_needs_update: "مُعلَّمة «تحتاج تحديث»",
  open_reports: "بلاغات مفتوحة تستدعي التحقق",
  overdue: "تجاوزت موعد المراجعة",
} as const;

export const AUDIT_LABEL: Record<string, string> = {
  CREATED: "إضافة الخدمة",
  EDITED: "تعديل المحتوى",
  REVIEWED: "تسجيل مراجعة",
  STATUS: "تغيير مرحلة النشر",
  SCHEDULE: "تعديل جدولة المراجعة",
  SOURCE_ADDED: "إضافة مصدر",
  SOURCE_EDITED: "تعديل مصدر",
  SOURCE_REMOVED: "حذف مصدر",
  REPORT: "إجراء على بلاغ",
};

export const FIELD_LABEL: Record<string, string> = {
  categoryId: "القسم", icon: "الأيقونة", audience: "الفئة المستهدفة",
  titleAr: "الاسم (عربي)", titleEn: "الاسم (إنجليزي)", shortDescAr: "الوصف (عربي)", shortDescEn: "الوصف (إنجليزي)",
  departmentAr: "الجهة (عربي)", departmentEn: "الجهة (إنجليزي)", feesAr: "الرسوم (عربي)", feesEn: "الرسوم (إنجليزي)",
  durationAr: "المدة (عربي)", durationEn: "المدة (إنجليزي)", hoursAr: "ساعات العمل (عربي)", hoursEn: "ساعات العمل (إنجليزي)",
  eligibilityAr: "المستفيدون (عربي)", eligibilityEn: "المستفيدون (إنجليزي)", sourceAr: "نص المصدر (عربي)", sourceEn: "نص المصدر (إنجليزي)",
  steps: "الخطوات", documents: "المستندات", notes: "الملاحظات", keywords: "كلمات البحث",
};
