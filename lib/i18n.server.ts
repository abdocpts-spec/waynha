import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/i18n";

/** لغة الواجهة الحالية (كوكي تضبطه قائمة اللغة). الافتراضي العربية. */
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : "ar";
}
