import { redirect } from "next/navigation";
import LoginForm from "@/components/account/LoginForm";
import { getAudience } from "@/lib/audience.server";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";

export const metadata = {
  title: "إنشاء حساب | وينها",
};

export default async function RegisterPage() {
  const [lang, user, audience] = await Promise.all([getLang(), getCurrentUser(), getAudience()]);
  if (user) redirect("/dashboard");
  // نوع الزائر يُختار في صفحة الترحيب أولاً
  if (!audience) redirect("/");
  return (
    <main>
      <LoginForm lang={lang} mode="signup" defaultRole={audience ?? undefined} />
    </main>
  );
}
