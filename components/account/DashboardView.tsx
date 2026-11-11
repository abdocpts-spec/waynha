"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import {
  clearRecentSearches,
  readProfile,
  readRecentSearches,
  readSavedServices,
  saveProfile,
  toggleSavedService,
  type Profile,
  type RecentSearch,
} from "@/lib/preferences";

type ServiceItem = { id: string; icon: string; title: string; category: string };
type Update = { id: string; title: string; date: string };

/**
 * لوحة التحكم (نفس تصميم النموذج الأولي): آخر عمليات البحث، والإجراءات المحفوظة،
 * وآخر تحديثات المعلومات. البيانات الشخصية محفوظة على هذا الجهاز فقط.
 */
export default function DashboardView({
  lang,
  services,
  updates,
}: {
  lang: Lang;
  services: ServiceItem[];
  updates: Update[];
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const [soon, setSoon] = useState("");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const load = () => {
      setProfile(readProfile());
      setRecent(readRecentSearches().slice(0, 5));
      setSaved(readSavedServices());
      setNow(Date.now());
      setToday(
        new Date().toLocaleDateString(lang === "ar" ? "ar-LY" : "en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          numberingSystem: "latn",
        }),
      );
    };
    load();
    window.addEventListener("waynha-prefs", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("waynha-prefs", load);
      window.removeEventListener("storage", load);
    };
  }, [lang]);

  const savedServices = saved
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is ServiceItem => Boolean(s));

  const firstName = profile?.name.trim().split(/\s+/)[0];
  const ago = (at: number) => {
    const minutes = Math.round((now - at) / 60000);
    if (minutes < 1) return t(lang, "الآن", "just now");
    if (minutes < 60) return t(lang, `قبل ${minutes} دقيقة`, `${minutes} min ago`);
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t(lang, `قبل ${hours} ساعة`, `${hours} h ago`);
    const days = Math.round(hours / 24);
    return t(lang, `قبل ${days} يوم`, `${days} d ago`);
  };

  const logout = () => {
    saveProfile(null);
    router.push("/");
  };

  const sidebar = [
    { href: "/dashboard", icon: "📊", ar: "لوحة التحكم", en: "Dashboard", active: true },
    { href: "/services", icon: "📋", ar: "الخدمات الحكومية", en: "Government services" },
    { href: "#saved", icon: "💾", ar: "الإجراءات المحفوظة", en: "Saved procedures" },
    { soon: true, icon: "📍", ar: "الجهات المحفوظة", en: "Saved offices" },
    { soon: true, icon: "📄", ar: "ملفات PDF", en: "PDF files" },
    { href: "/settings", icon: "⚙️", ar: "الإعدادات", en: "Settings" },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar" aria-label={t(lang, "قائمة لوحة التحكم", "Dashboard menu")}>
        <div className="sidebar-menu">
          {sidebar.map((item) =>
            item.soon ? (
              <button
                key={item.en}
                type="button"
                className="sidebar-item"
                onClick={() => setSoon(t(lang, `${item.ar} غير متاحة في النسخة الحالية.`, `${item.en} isn't available yet.`))}
              >
                <span aria-hidden="true">{item.icon}</span> {t(lang, item.ar, item.en)}
                <span className="soon-badge">{t(lang, "قريباً", "Soon")}</span>
              </button>
            ) : (
              <Link key={item.en} href={item.href!} className={`sidebar-item${item.active ? " active" : ""}`}>
                <span aria-hidden="true">{item.icon}</span> {t(lang, item.ar, item.en)}
              </Link>
            ),
          )}
          {profile ? (
            <button type="button" className="sidebar-item sidebar-logout" onClick={logout}>
              <span aria-hidden="true">🚪</span> {t(lang, "تسجيل الخروج", "Sign out")}
            </button>
          ) : (
            <Link href="/login" className="sidebar-item sidebar-logout" style={{ color: "var(--primary)" }}>
              <span aria-hidden="true">🔑</span> {t(lang, "تسجيل الدخول", "Sign in")}
            </Link>
          )}
        </div>
      </aside>

      <section className="dash-main">
        <div className="dash-header">
          <div>
            <h1 className="welcome-text">
              {firstName ? t(lang, `مرحباً، ${firstName} 👋`, `Hello, ${firstName} 👋`) : t(lang, "مرحباً بيك 👋", "Welcome 👋")}
            </h1>
            <div className="date-text">{today}</div>
          </div>
          <Link href="/services" className="btn-primary">
            {t(lang, "بحث عن إجراء جديد", "Find a new procedure")}
          </Link>
        </div>

        {soon && (
          <p className="form-note" role="status" style={{ textAlign: "start", marginBottom: 16 }}>
            {soon}
          </p>
        )}
        {!profile && (
          <p className="auth-privacy" style={{ textAlign: "start", marginTop: 0, marginBottom: 24 }}>
            {t(
              lang,
              "ما سجلتش دخولك. المحفوظات وآخر عمليات البحث تعمل بدون حساب، وتُحفظ على هذا الجهاز فقط.",
              "You're not signed in. Saved items and recent searches work without an account and stay on this device.",
            )}
          </p>
        )}

        <div className="dash-grid">
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">🔍 {t(lang, "آخر عمليات البحث", "Recent searches")}</h2>
              {recent.length > 0 && (
                <button type="button" className="link-btn" style={{ fontSize: "0.85rem" }} onClick={clearRecentSearches}>
                  {t(lang, "مسح", "Clear")}
                </button>
              )}
            </div>
            <div className="list-group">
              {recent.length ? (
                recent.map((r) => (
                  <Link key={r.at} href={`/assistant?q=${encodeURIComponent(r.q)}`} className="list-item">
                    <div>
                      <div className="list-item-title">{r.q}</div>
                      <div className="list-item-sub">{ago(r.at)}</div>
                    </div>
                    <span aria-hidden="true">{lang === "ar" ? "←" : "→"}</span>
                  </Link>
                ))
              ) : (
                <div className="list-empty">{t(lang, "ما فيش عمليات بحث بعد.", "No searches yet.")}</div>
              )}
            </div>
          </div>

          <div className="dash-card" id="saved">
            <div className="dash-card-header">
              <h2 className="dash-card-title">💾 {t(lang, "الإجراءات المحفوظة", "Saved procedures")}</h2>
            </div>
            <div className="list-group">
              {savedServices.length ? (
                savedServices.map((s) => (
                  <div key={s.id} className="list-item">
                    <Link href={`/services/${s.id}`} style={{ flex: 1 }}>
                      <div className="list-item-title">
                        {s.icon} {s.title}
                      </div>
                      <div className="list-item-sub">{s.category}</div>
                    </Link>
                    <button
                      type="button"
                      className="link-btn"
                      aria-label={t(lang, `إلغاء حفظ ${s.title}`, `Unsave ${s.title}`)}
                      title={t(lang, "إلغاء الحفظ", "Unsave")}
                      onClick={() => toggleSavedService(s.id)}
                    >
                      ★
                    </button>
                  </div>
                ))
              ) : (
                <div className="list-empty">
                  {t(lang, "احفظ أي إجراء من صفحته بزر «☆ حفظ الإجراء».", "Save any procedure from its page with “☆ Save procedure”.")}
                </div>
              )}
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">🔔 {t(lang, "آخر تحديثات المعلومات", "Latest information updates")}</h2>
            </div>
            <div className="list-group">
              {updates.length ? (
                updates.map((u) => (
                  <Link key={u.id} href={`/services/${u.id}`} className="list-item list-item-accent">
                    <div>
                      <div className="list-item-title">{u.title}</div>
                      <div className="list-item-sub">
                        {t(lang, "راجعها فريق وينها:", "Reviewed by the WAYNHA team:")} {u.date}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="list-empty">{t(lang, "ما فيش تحديثات حالياً.", "No updates yet.")}</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
