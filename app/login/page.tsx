import LoginForm from "@/components/account/LoginForm";
import { getLang } from "@/lib/i18n.server";

export const metadata = {
  title: "تسجيل الدخول | وينها",
};

export default async function LoginPage() {
  const lang = await getLang();
  return (
    <main>
      <LoginForm lang={lang} />
    </main>
  );
}
