"use client";

import LanguagePicker from "@/components/layout/LanguagePicker";
import type { Lang } from "@/lib/i18n";

/** قائمة اللغة (قابلة للتوسع بإضافة لغات في LANGUAGES) وزر المظهر لصفحة الترحيب. */
export default function LanderControls({ lang }: { lang: Lang }) {
  const toggleTheme = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("waynha-theme", next);
    } catch {
      // وضع التصفح الخاص — يكفي تغيير المظهر للجلسة الحالية
    }
  };

  return (
    <div className="lander-controls">
      <LanguagePicker lang={lang} variant="lander" />
      <button
        type="button"
        className="icon-btn"
        onClick={toggleTheme}
        aria-label={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
        title={lang === "ar" ? "تغيير المظهر" : "Toggle theme"}
      >
        <span className="theme-icon-light" aria-hidden="true">🌙</span>
        <span className="theme-icon-dark" aria-hidden="true">☀️</span>
      </button>
    </div>
  );
}
