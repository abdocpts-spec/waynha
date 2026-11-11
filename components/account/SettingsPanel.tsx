"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import {
  DEFAULT_PRIMARY,
  PREF_KEYS,
  PRIMARY_COLORS,
  applyPreferences,
  readPref,
  readProfile,
  saveProfile,
  writePref,
  type FontSize,
  type Profile,
} from "@/lib/preferences";

export type SectionId = "accessibility" | "appearance" | "account" | "language";
type City = { id: string; nameAr: string; nameEn: string };

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle-switch${disabled ? " is-disabled" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}

function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`btn-option${active ? " active" : ""}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  );
}

/** الإعدادات والوصولية (نفس أقسام النموذج الأولي، وكل خيار يُطبَّق فعلياً على الموقع). */
export default function SettingsPanel({
  lang,
  cities,
  initialSection,
}: {
  lang: Lang;
  cities: City[];
  initialSection: SectionId;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [font, setFont] = useState<FontSize>("");
  const [contrast, setContrast] = useState(false);
  const [simple, setSimple] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [primary, setPrimary] = useState<string>(DEFAULT_PRIMARY);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile>({ name: "", contact: "", cityId: "" });
  const [saved, setSaved] = useState(false);

  // نقرأ القيم المحفوظة بعد التحميل (localStorage غير متاح على الخادم)،
  // ونعيد قراءتها إذا تغيّرت من تبويب آخر أو من زر المظهر في الترويسة
  useEffect(() => {
    const load = () => {
      const f = readPref(PREF_KEYS.font);
      setFont(f === "large-text" || f === "xlarge-text" ? f : "");
      setContrast(readPref(PREF_KEYS.contrast) === "1");
      setSimple(readPref(PREF_KEYS.simple) === "1");
      setTheme(readPref(PREF_KEYS.theme) === "dark" ? "dark" : "light");
      setPrimary(readPref(PREF_KEYS.primary, DEFAULT_PRIMARY).toLowerCase());
      const p = readProfile();
      setProfile(p);
      if (p) setDraft(p);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const update = (key: string, value: string | null) => {
    writePref(key, value);
    applyPreferences();
  };

  const switchLang = (next: Lang) => {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const next = { ...draft, name: draft.name.trim(), contact: profile.contact };
    saveProfile(next);
    setProfile(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const logout = () => {
    saveProfile(null);
    setProfile(null);
    setDraft({ name: "", contact: "", cityId: "" });
  };

  const nav: { id: SectionId; icon: string; ar: string; en: string }[] = [
    { id: "accessibility", icon: "👁️", ar: "إمكانية الوصول", en: "Accessibility" },
    { id: "appearance", icon: "🎨", ar: "المظهر", en: "Appearance" },
    { id: "account", icon: "👤", ar: "الحساب الشخصي", en: "Account" },
    { id: "language", icon: "🌐", ar: "اللغة (Language)", en: "Language (اللغة)" },
  ];

  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label={t(lang, "أقسام الإعدادات", "Settings sections")}>
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`s-nav-item${section === item.id ? " active" : ""}`}
            aria-current={section === item.id ? "page" : undefined}
            onClick={() => setSection(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span> {t(lang, item.ar, item.en)}
          </button>
        ))}
      </nav>

      <div>
        {section === "accessibility" && (
          <section className="settings-section">
            <h2 className="section-title">{t(lang, "إمكانية الوصول (Accessibility)", "Accessibility")}</h2>

            <div className="setting-group">
              <div className="setting-label">{t(lang, "حجم الخط", "Text size")}</div>
              <div className="setting-desc">{t(lang, "اختر الحجم المناسب للقراءة المريحة.", "Choose a comfortable reading size.")}</div>
              <div className="btn-group">
                {([
                  ["", "عادي", "Normal"],
                  ["large-text", "كبير", "Large"],
                  ["xlarge-text", "كبير جداً", "Extra large"],
                ] as const).map(([value, ar, en]) => (
                  <Option
                    key={value || "normal"}
                    active={font === value}
                    onClick={() => {
                      setFont(value);
                      update(PREF_KEYS.font, value || null);
                    }}
                  >
                    {t(lang, ar, en)}
                  </Option>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <div className="setting-label">{t(lang, "التباين العالي (High Contrast)", "High contrast")}</div>
              <div className="setting-desc">{t(lang, "يعزز وضوح الألوان والنصوص لضعاف البصر.", "Stronger colors and text for low vision.")}</div>
              <Toggle
                checked={contrast}
                label={t(lang, "تفعيل التباين العالي", "Enable high contrast")}
                onChange={(v) => {
                  setContrast(v);
                  update(PREF_KEYS.contrast, v ? "1" : null);
                }}
              />
            </div>

            <div className="setting-group">
              <div className="setting-label">{t(lang, "الوضع المبسط (Simple Mode)", "Simple mode")}</div>
              <div className="setting-desc">
                {t(
                  lang,
                  "واجهة خالية من التشتت وأزرار أكبر، بدون حركات وخلفيات متحركة. مثالي لكبار السن.",
                  "A calmer interface with bigger buttons and no animations. Ideal for older users.",
                )}
              </div>
              <Toggle
                checked={simple}
                label={t(lang, "تفعيل الوضع المبسط", "Enable simple mode")}
                onChange={(v) => {
                  setSimple(v);
                  update(PREF_KEYS.simple, v ? "1" : null);
                }}
              />
            </div>

            <div className="setting-group">
              <div className="setting-label">
                {t(lang, "المساعد الصوتي الآلي", "Automatic voice reading")} <span className="soon-badge">{t(lang, "قريباً", "Soon")}</span>
              </div>
              <div className="setting-desc">
                {t(lang, "قراءة الشاشة والإجراءات تلقائياً عند فتحها.", "Read screens and procedures aloud when opened.")}
              </div>
              <Toggle checked={false} disabled label={t(lang, "تفعيل القراءة الآلية", "Enable auto reading")} />
            </div>
          </section>
        )}

        {section === "appearance" && (
          <section className="settings-section">
            <h2 className="section-title">{t(lang, "المظهر والألوان", "Appearance and colors")}</h2>
            <div className="setting-group">
              <div className="setting-label">{t(lang, "وضع الشاشة", "Screen mode")}</div>
              <div className="btn-group">
                <Option
                  active={theme === "light"}
                  onClick={() => {
                    setTheme("light");
                    update(PREF_KEYS.theme, "light");
                  }}
                >
                  {t(lang, "فاتح ☀️", "Light ☀️")}
                </Option>
                <Option
                  active={theme === "dark"}
                  onClick={() => {
                    setTheme("dark");
                    update(PREF_KEYS.theme, "dark");
                  }}
                >
                  {t(lang, "داكن 🌙", "Dark 🌙")}
                </Option>
              </div>
            </div>
            <div className="setting-group">
              <div className="setting-label">{t(lang, "اللون الرئيسي للمنصة", "Main color")}</div>
              {contrast && (
                <div className="setting-desc">
                  {t(lang, "التباين العالي مفعّل، فيستخدم ألوانه الخاصة.", "High contrast is on and uses its own colors.")}
                </div>
              )}
              <div className="color-picker">
                {PRIMARY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-btn${primary === color ? " active" : ""}`}
                    style={{ background: color }}
                    aria-label={color}
                    aria-pressed={primary === color}
                    onClick={() => {
                      setPrimary(color);
                      update(PREF_KEYS.primary, color === DEFAULT_PRIMARY ? null : color);
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {section === "account" && (
          <section className="settings-section">
            <h2 className="section-title">{t(lang, "إعدادات الحساب", "Account settings")}</h2>
            {!profile ? (
              <div className="setting-group">
                <p className="setting-desc">
                  {t(
                    lang,
                    "ما سجلتش دخولك. التسجيل اختياري، ويحفظ اسمك ومدينتك على هذا الجهاز.",
                    "You're not signed in. Signing in is optional and keeps your name and city on this device.",
                  )}
                </p>
                <Link href="/login" className="btn-primary">
                  {t(lang, "تسجيل الدخول", "Sign in")}
                </Link>
              </div>
            ) : (
              <form onSubmit={saveAccount}>
                <div className="setting-group">
                  <label className="setting-field-label" htmlFor="acc-name">
                    {t(lang, "الاسم الكامل", "Full name")}
                  </label>
                  <input
                    id="acc-name"
                    className="setting-input"
                    value={draft.name}
                    placeholder={t(lang, "اكتب اسمك", "Your name")}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="setting-group">
                  <label className="setting-field-label" htmlFor="acc-contact">
                    {t(lang, "رقم الهاتف أو البريد", "Phone or email")}
                  </label>
                  <input id="acc-contact" className="setting-input" value={profile.contact} dir="ltr" readOnly />
                </div>
                <div className="setting-group">
                  <label className="setting-field-label" htmlFor="acc-city">
                    {t(lang, "المدينة الافتراضية (لعرض أقرب الجهات)", "Default city (to show nearby offices)")}
                  </label>
                  <select
                    id="acc-city"
                    className="setting-input"
                    value={draft.cityId}
                    onChange={(e) => setDraft({ ...draft, cityId: e.target.value })}
                  >
                    <option value="">{t(lang, "— اختر مدينة —", "— Choose a city —")}</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {lang === "ar" ? city.nameAr : city.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="submit" className="btn-primary">
                    {t(lang, "حفظ التغييرات", "Save changes")}
                  </button>
                  <button type="button" className="btn-outline btn-danger-outline" onClick={logout}>
                    {t(lang, "تسجيل الخروج", "Sign out")}
                  </button>
                  {saved && (
                    <span role="status" style={{ color: "var(--success)", fontWeight: 600 }}>
                      {t(lang, "تم الحفظ ✓", "Saved ✓")}
                    </span>
                  )}
                </div>
                <p className="setting-desc" style={{ marginTop: 16 }}>
                  {t(lang, "بيانات الحساب محفوظة على هذا الجهاز فقط.", "Account data is stored on this device only.")}
                </p>
              </form>
            )}
          </section>
        )}

        {section === "language" && (
          <section className="settings-section">
            <h2 className="section-title">اللغة / Language</h2>
            <div className="btn-group">
              <Option active={lang === "ar"} onClick={() => switchLang("ar")}>
                العربية (Arabic)
              </Option>
              <Option active={lang === "en"} onClick={() => switchLang("en")}>
                English (الإنجليزية)
              </Option>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
