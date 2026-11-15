import "server-only";
import { createHmac } from "node:crypto";

/**
 * الرقم الوطني للمواطن الليبي ورقم الإقامة للأجنبي: لا يُخزَّنان أبداً كما هما.
 * نحفظ بصمة HMAC-SHA256 بسرّ موجود على الخادم فقط (NATIONAL_ID_SECRET)،
 * فتكفي لمنع التسجيل بنفس الرقم مرتين وللدخول به، ولا يمكن لأحد (حتى الأدمن) قراءة الرقم منها.
 *
 * ملاحظة: وينها ليست مرتبطة بمنظومة الأحوال المدنية، فالفحص هنا لشكل الرقم فقط وليس لصحته.
 */

/** يحوّل الأرقام العربية-الهندية (٠-٩ و ۰-۹) إلى أرقام لاتينية. */
export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/** 12 رقماً يبدأ بـ 1 (ذكر) أو 2 (أنثى). يرجع null إن كانت الصيغة غير صحيحة. */
export function normalizeNationalId(raw: string): string | null {
  const digits = toLatinDigits(raw).replace(/[\s-]/g, "");
  return /^[12]\d{11}$/.test(digits) ? digits : null;
}

function hmac(value: string): string {
  const secret = process.env.NATIONAL_ID_SECRET;
  if (!secret || secret.length < 16) throw new Error("NATIONAL_ID_SECRET غير مضبوط في .env.local");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashNationalId(nationalId: string): string {
  return hmac(nationalId);
}

/**
 * رقم الإقامة للأجنبي: لا نعرف صيغة رسمية ثابتة له، فنقبل حروفاً لاتينية وأرقاماً (5 إلى 20)
 * بعد حذف المسافات والشرطات وتوحيد الحروف الكبيرة.
 */
export function normalizeResidenceId(raw: string): string | null {
  const value = toLatinDigits(raw).toUpperCase().replace(/[\s\-\/]/g, "");
  return /^[A-Z0-9]{5,20}$/.test(value) ? value : null;
}

/** بادئة مختلفة حتى لا تتطابق بصمة رقم إقامة مع بصمة رقم وطني بنفس الأرقام. */
export function hashResidenceId(residenceId: string): string {
  return hmac(`residence:${residenceId}`);
}
