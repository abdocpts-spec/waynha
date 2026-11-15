/** أدوات اللغة المشتركة بين الخادم والمتصفح (بدون next/headers). */

/**
 * اللغات المدعومة. العربية والإنجليزية نصوصهما مكتوبة يدوياً في الكود (t())،
 * وبقية اللغات تُترجَم آلياً من النص الإنجليزي وقت العرض (components/layout/AutoTranslate.tsx).
 * لإضافة لغة: أضفها هنا فقط.
 */
export const LANGUAGES = [
  { code: "ar", label: "العربية", english: "Arabic", rtl: true },
  { code: "en", label: "English", english: "English", rtl: false },
  { code: "fr", label: "Français", english: "French", rtl: false },
  { code: "es", label: "Español", english: "Spanish", rtl: false },
  { code: "de", label: "Deutsch", english: "German", rtl: false },
  { code: "it", label: "Italiano", english: "Italian", rtl: false },
  { code: "tr", label: "Türkçe", english: "Turkish", rtl: false },
  { code: "ru", label: "Русский", english: "Russian", rtl: false },
  { code: "zh", label: "中文", english: "Chinese (Simplified)", rtl: false },
  { code: "hi", label: "हिन्दी", english: "Hindi", rtl: false },
  { code: "ur", label: "اردو", english: "Urdu", rtl: true },
  { code: "bn", label: "বাংলা", english: "Bengali", rtl: false },
  { code: "pt", label: "Português", english: "Portuguese", rtl: false },
  { code: "nl", label: "Nederlands", english: "Dutch", rtl: false },
  { code: "pl", label: "Polski", english: "Polish", rtl: false },
  { code: "uk", label: "Українська", english: "Ukrainian", rtl: false },
  { code: "el", label: "Ελληνικά", english: "Greek", rtl: false },
  { code: "ro", label: "Română", english: "Romanian", rtl: false },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

export const LANG_COOKIE = "waynha-lang";

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

/** لغة نصوصها مكتوبة يدوياً (بقية اللغات تُترجم آلياً من الإنجليزية). */
export function isBaseLang(lang: Lang): lang is "ar" | "en" {
  return lang === "ar" || lang === "en";
}

/** لغة النصوص اليدوية المقابلة: العربية للعربية، والإنجليزية لكل ما عداها. */
export function uiLang(lang: Lang): "ar" | "en" {
  return lang === "ar" ? "ar" : "en";
}

/** اختيار النص حسب اللغة (غير العربية تأخذ الإنجليزية ثم تُترجَم آلياً). */
export function t(lang: Lang, ar: string, en: string): string {
  return lang === "ar" ? ar : en;
}

export function dir(lang: Lang): "rtl" | "ltr" {
  return LANGUAGES.find((l) => l.code === lang)?.rtl ? "rtl" : "ltr";
}
