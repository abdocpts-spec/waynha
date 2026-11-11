"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import BrandMark from "./BrandMark";
import { initials, readProfile, type Profile } from "@/lib/preferences";

/** ترويسة الموقع: تنقّل + تبديل المظهر واللغة (نفس تصميم النموذج الأولي). */
export default function Header({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // الحساب المحلي (lib/preferences.ts): يتحدث عند الدخول/الخروج في أي تبويب
  useEffect(() => {
    const sync = () => setProfile(readProfile());
    sync();
    window.addEventListener("waynha-prefs", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("waynha-prefs", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // المظهر الحالي مخزّن على <html data-theme> (يضبطه سكربت في layout قبل أول رسم)
  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("waynha-theme", next);
    } catch {
      // وضع التصفح الخاص — نكتفي بتغيير المظهر للجلسة الحالية
    }
  };

  const toggleLang = () => {
    const next: Lang = lang === "ar" ? "en" : "ar";
    document.cookie = `waynha-lang=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const links = [
    { href: "/", ar: "الرئيسية", en: "Home" },
    { href: "/services", ar: "الخدمات", en: "Services" },
    { href: "/offices", ar: "الجهات الحكومية", en: "Offices" },
    { href: "/assistant", ar: "المساعد الذكي", en: "AI Assistant" },
  ];

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
          <button
            className="icon-btn"
            onClick={toggleLang}
            aria-label="Switch language"
            title="Switch language"
          >
            {lang === "ar" ? "En" : "عربي"}
          </button>
          <Link
            href="/settings"
            className="icon-btn"
            aria-label={lang === "ar" ? "الإعدادات والوصولية" : "Settings and accessibility"}
            title={lang === "ar" ? "الإعدادات والوصولية" : "Settings and accessibility"}
          >
            <span aria-hidden="true">⚙️</span>
          </Link>
          {profile ? (
            <Link
              href="/dashboard"
              className="account-chip"
              aria-label={lang === "ar" ? "لوحة التحكم" : "Dashboard"}
              title={profile.name || profile.contact}
            >
              {initials(profile)}
            </Link>
          ) : (
            <Link href="/login" className="btn-outline header-login">
              {lang === "ar" ? "دخول" : "Sign in"}
            </Link>
          )}
          <Link href="/assistant" className="btn-primary">
            {lang === "ar" ? "اسأل وينها" : "Ask WAYNHA"}
          </Link>
        </div>
      </div>
    </header>
  );
}
