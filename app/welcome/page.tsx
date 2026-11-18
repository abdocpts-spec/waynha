import { redirect } from "next/navigation";
import Lander from "@/components/Lander";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export const metadata = { title: "وينها | WAYNHA" };

/** اختيار «مواطن ليبي / أجنبي» — يُفتح بعد الضغط على تسجيل الدخول من الصفحة الرئيسية. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [lang, user, { next }] = await Promise.all([getLang(), getCurrentUser(), searchParams]);
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return <Lander lang={lang} next={safeNext} />;
}
