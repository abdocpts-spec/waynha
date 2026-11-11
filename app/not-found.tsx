import Link from "next/link";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";

/** صفحة «غير موجودة» بلغة الموقع (بدل صفحة Next.js الإنجليزية الافتراضية). */
export default async function NotFound() {
  const lang = await getLang();
  return (
    <main className="container" style={{ padding: "calc(var(--header-height) + 80px) 16px 80px", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }} aria-hidden="true">
        🧭
      </div>
      <h1 className="page-title">{t(lang, "الصفحة هذي مش موجودة", "This page doesn't exist")}</h1>
      <p className="page-subtitle" style={{ marginBottom: 28 }}>
        {t(
          lang,
          "يمكن الرابط غلط أو الصفحة تنقلت. جرّب ترجع للرئيسية أو تسأل المساعد.",
          "The link may be wrong or the page has moved. Go back home or ask the assistant.",
        )}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/" className="btn-primary">
          {t(lang, "الرئيسية", "Home")}
        </Link>
        <Link href="/services" className="btn-outline">
          {t(lang, "دليل الخدمات", "Services directory")}
        </Link>
        <Link href="/assistant" className="btn-outline">
          {t(lang, "اسأل وينها", "Ask WAYNHA")}
        </Link>
      </div>
    </main>
  );
}
