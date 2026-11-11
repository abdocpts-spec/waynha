/** أدوات اللغة المشتركة بين الخادم والمتصفح (بدون next/headers). */

export type Lang = "ar" | "en";

export const LANG_COOKIE = "waynha-lang";

/** اختيار النص حسب اللغة. */
export function t(lang: Lang, ar: string, en: string): string {
  return lang === "ar" ? ar : en;
}

export function dir(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}
