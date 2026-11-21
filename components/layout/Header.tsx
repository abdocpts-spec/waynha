"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Audience } from "@/lib/audience";
import type { Lang } from "@/lib/i18n";
import { toggleLightDark } from "@/lib/preferences";
import AccountMenu from "./AccountMenu";
import BrandMark from "./BrandMark";
import LanguagePicker from "./LanguagePicker";

/** بيانات الحساب التي تحتاجها الترويسة (تأتي من الخادم في layout). */
export type HeaderUser = { name: string; role: "CITIZEN" | "FOREIGNER" | "ADMIN" } | null;

function initials(name: string): string {
  const parts = name.trim().split(/s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

/** ترويسة الموقع: تنقّل + تبديل المظهر واللغة (نفس تصميم النموذج الأولي). */
export default function Header({ lang, user, audience, attention = 0 }: { lang: Lang; user: HeaderUser; audience: Audience | null; attention?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // المظهر الحالي مخزّن على <html data-theme> (يضبطه سكربت في layout قبل أول رسم)
  const toggleTheme = toggleLightDark;

  const links = [
    { href: "/", ar: "الرئيسية", en: "Home" },
    { href: "/services", ar: "الخدمات", en: "Services" },
    { href: "/offices", ar: "الجهات الحكومية", en: "Offices" },
    { href: "/assistant", ar: "المساعد الذكي", en: "AI Assistant" },
  ];

  const shownType = user && user.role !== "ADMIN" ? user.role : audience;
  return (
    <header className={`header${scrolled ? " scrolled" : ""}`} id="header">
      <div className="container">
        <Link href="/" className="logo">
          <BrandMark />
          <span className="logo-text">{lang === "ar" ? "وينها | WAYNHA" : "WAYNHA"}</span>
        </Link>

        <nav className="desktop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? " active" : ""}`}
            >
              {lang === "ar" ? link.ar : link.en}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <div className="hdr-old">
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
            title={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
          >
            {/* الأيقونة تتبدل بالـ CSS حسب data-theme حتى لا يومض الزر */}
            <span className="theme-icon-light" aria-hidden="true">🌙</span>
            <span className="theme-icon-dark" aria-hidden="true">☀️</span>
          </button>
          {(typeof shownType === "string") && (
            // نوع الزائر للعرض فقط: يتغير بالدخول من صفحة الاختيار، ولا يتغير بالضغط هنا
            <span
              className="icon-btn"
              style={{ cursor: "default", pointerEvents: "none" }}
              aria-label={lang === "ar" ? "نوع الحساب" : "Account type"}
            >
              {shownType === "CITIZEN" ? (lang === "ar" ? "مواطن" : "Citizen") : lang === "ar" ? "أجنبي" : "Foreigner"}
            </span>
          )}
          </div>
          <LanguagePicker lang={lang} onlyBase={audience === "CITIZEN"} />
          <div className="hdr-old">
          <Link
            href="/settings"
            className="icon-btn"
            aria-label={lang === "ar" ? "الإعدادات والوصولية" : "Settings and accessibility"}
            title={lang === "ar" ? "الإعدادات والوصولية" : "Settings and accessibility"}
          >
            <span aria-hidden="true">⚙️</span>
          </Link>
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="btn-outline header-admin" title={lang === "ar" ? "لوحة الإدارة" : "Admin"}>
              <span aria-hidden="true">🛡️</span>
              <span className="header-admin-text">{lang === "ar" ? "لوحة الإدارة" : "Admin"}</span>
            </Link>
          )}
          {user ? (
            <Link
              href="/dashboard"
              className="account-chip"
              aria-label={lang === "ar" ? "لوحة التحكم" : "Dashboard"}
              title={user.name}
            >
              {initials(user.name)}
              {attention > 0 && <span className="chip-dot" aria-label={lang === "ar" ? "إجراء يحتاج تعديلاً" : "A procedure needs changes"} />}
            </Link>
          ) : (
            <Link href="/welcome" className="btn-outline header-login">
              {lang === "ar" ? "دخول" : "Sign in"}
            </Link>
          )}
          </div>
          <div className="hdr-desk">
            {!user && (
              <Link href="/welcome" className="btn-outline header-login hdr-login">
                {lang === "ar" ? "دخول" : "Sign in"}
              </Link>
            )}
            <AccountMenu lang={lang} user={user} initials={user ? initials(user.name) : ""} attention={attention} />
          </div>
          <Link href="/assistant" className="btn-primary">
            {lang === "ar" ? "اسأل وينها" : "Ask WAYNHA"}
          </Link>
        </div>
      </div>
    </header>
  );
}
