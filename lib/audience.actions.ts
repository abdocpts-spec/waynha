"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUDIENCE_COOKIE, parseAudience } from "@/lib/audience";
import { LANG_COOKIE, isLang } from "@/lib/i18n";

/** يحفظ اختيار الزائر. بلا تاريخ انتهاء عمداً: كوكي جلسة، فتُعرض صفحة الترحيب في كل زيارة جديدة. */
export async function chooseAudience(formData: FormData) {
  const audience = parseAudience(formData.get("audience"));
  if (audience) {
    (await cookies()).set(AUDIENCE_COOKIE, audience, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    // الأجنبي يتحوّل الموقع تلقائياً للإنجليزية، إلا إن كان اختار لغة أخرى غير العربية
    if (audience === "FOREIGNER" && ((await cookies()).get(LANG_COOKIE)?.value ?? "ar") === "ar") {
      (await cookies()).set(LANG_COOKIE, "en", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    // المواطن يستخدم العربية أو الإنجليزية فقط
    if (audience === "CITIZEN") {
      const current = (await cookies()).get(LANG_COOKIE)?.value;
      if (isLang(current) && current !== "ar" && current !== "en")
        (await cookies()).set(LANG_COOKIE, "ar", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    // بعد الاختيار ننتقل مباشرة إلى تسجيل الدخول
    redirect("/login");
  }
  redirect("/");
}

/** يمسح الاختيار للرجوع إلى صفحة الترحيب وتغييره. */
export async function resetAudience() {
  (await cookies()).delete(AUDIENCE_COOKIE);
  redirect("/");
}
