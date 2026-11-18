import { redirect } from "next/navigation";
import LoginForm from "@/components/account/LoginForm";
import { getAudience } from "@/lib/audience.server";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";

export const metadata = {
  title: "تسجيل الدخول | وينها",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [lang, user, audience, { next }] = await Promise.all([getLang(), getCurrentUser(), getAudience(), searchParams]);
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  // الدخول يمر دائماً بصفحة اختيار مواطن/أجنبي أولاً
  if (!audience) redirect(next ? `/welcome?next=${encodeURIComponent(next)}` : "/welcome");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main>
      <LoginForm lang={lang} mode="login" next={safeNext} defaultRole={audience ?? undefined} />
    </main>
  );
}
