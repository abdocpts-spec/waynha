/**
 * مراحل متابعة الإجراء. يحدّدها المستخدم بنفسه، وليست حالة رسمية من أي جهة حكومية
 * (وينها لا تتصل بالجهات ولا تعرف حالة الطلب الحقيقية).
 */
export const STAGES = [
  { n: 1, ar: "بدأت", en: "Started" },
  { n: 2, ar: "أجمع المستندات", en: "Gathering documents" },
  { n: 3, ar: "قدّمت الطلب", en: "Submitted" },
  { n: 4, ar: "بانتظار الرد", en: "Waiting for a reply" },
  { n: 5, ar: "أنجزت", en: "Done" },
] as const;

export const LAST_STAGE = STAGES.length;

export function isStage(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= LAST_STAGE;
}
