import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import BrandMark from "./BrandMark";

export default function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <Link href="/" className="logo" style={{ marginBottom: 16 }}>
              <BrandMark />
              <span className="logo-text">{t(lang, "وينها | WAYNHA", "WAYNHA")}</span>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", maxWidth: 320, lineHeight: 1.7 }}>
              {t(
                lang,
                "منصة وينها — دليل إرشادي مستقل للإجراءات والخدمات الحكومية في ليبيا. وينها ليست جهة حكومية.",
                "WAYNHA — an independent guide to government procedures and services in Libya. WAYNHA is not a government entity.",
              )}
            </p>
          </div>
          <div className="footer-col">
            <h4>{t(lang, "روابط سريعة", "Quick links")}</h4>
            <ul className="footer-links">
              <li><Link href="/services">{t(lang, "الخدمات الحكومية", "Government services")}</Link></li>
              <li><Link href="/offices">{t(lang, "الجهات الحكومية", "Government offices")}</Link></li>
              <li><Link href="/assistant">{t(lang, "مساعد وينها", "WAYNHA assistant")}</Link></li>
              <li><Link href="/install">{t(lang, "ثبّت التطبيق على هاتفك", "Install the app")}</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>{t(lang, "تواصل معنا", "Contact us")}</h4>
            <ul className="footer-links">
              <li><a href="mailto:info@waynha.ly">info@waynha.ly</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 {t(lang, "وينها | WAYNHA — جميع الحقوق محفوظة", "WAYNHA — All rights reserved")}
        </div>
      </div>
    </footer>
  );
}
