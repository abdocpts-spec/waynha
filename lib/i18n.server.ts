import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** لغة الواجهة الحالية (كوكي يضبطه زر تبديل اللغة). */
export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
}
