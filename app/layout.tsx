import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AssistantLauncher from "@/components/assistant/AssistantLauncher";
import { InlineScript } from "@/components/layout/InlineScript";
import AutoTranslate from "@/components/layout/AutoTranslate";
import PrefsSync from "@/components/layout/PrefsSync";
import { dir } from "@/lib/i18n";
import { getAudience } from "@/lib/audience.server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";
import { PREFS_SCRIPT } from "@/lib/preferences";

export const metadata: Metadata = {
  title: "وينها | WAYNHA — دليلك للخدمات الحكومية الليبية",
  description:
    "منصة وينها — دليل إرشادي مستقل للإجراءات والخدمات الحكومية في ليبيا، مع مساعد ذكي يفهم اللهجة الليبية.",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1a56db",
  width: "device-width",
  initialScale: 1,
};


// التطبيق لا يستخدم Service Worker: نلغي أي تسجيل قديم من النموذج الأولي (انظر public/sw.js)
const SW_CLEANUP_SCRIPT = `try{navigator.serviceWorker&&navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})})}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, user, audience] = await Promise.all([getLang(), getCurrentUser(), getAudience()]);
  // إجراءات طلب الأدمن تعديل مستنداتها: نقطة تنبيه على أيقونة الحساب
  const attention = user ? await prisma.procedureProgress.count({ where: { userId: user.id, reviewStatus: "NEEDS_CHANGES" } }) : 0;

  return (
    <html lang={lang} dir={dir(lang)} data-theme="light" suppressHydrationWarning>
      <head>
        {/* يطبّق المظهر وحجم الخط والتباين واللون قبل أول رسم (lib/preferences.ts) */}
        <InlineScript html={PREFS_SCRIPT} />
        <InlineScript html={SW_CLEANUP_SCRIPT} />
      </head>
      <body>
        <PrefsSync />
        <AutoTranslate lang={lang} />
        <Header lang={lang} user={user ? { name: user.name, role: user.role } : null} audience={audience} attention={attention} />
        {children}
        <Footer lang={lang} />
        <AssistantLauncher lang={lang} />
      </body>
    </html>
  );
}
