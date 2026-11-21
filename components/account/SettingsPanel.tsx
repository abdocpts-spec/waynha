"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountForm, { type AccountInfo } from "@/components/account/AccountForm";
import { LANG_COOKIE, t, type Lang } from "@/lib/i18n";
import {
  DEFAULT_PRIMARY,
  PREF_KEYS,
  PRIMARY_COLORS,
  SCREEN_MODES,
  applyPreferences,
  parseScreenMode,
  readPref,
  writePref,
  type FontSize,
  type ScreenMode,
} from "@/lib/preferences";

const MODE_META: Record<ScreenMode, { ar: string; en: string; bg: string; card: string; text: string; line: string }> = {
  light: { ar: "فاتح", en: "Light", bg: "#f0f4ff", card: "#ffffff", text: "#0f172a", line: "#e2e8f0" },
  dark: { ar: "داكن (أزرق ليلي)", en: "Dark (night blue)", bg: "#060d1f", card: "#0d1b35", text: "#f1f5f9", line: "#1e2d4a" },
  sepia: { ar: "دافئ (للقراءة)", en: "Warm (reading)", bg: "#f4ecd8", card: "#fbf6e9", text: "#3a2e1c", line: "#e3d6b8" },
  sage: { ar: "أخضر هادئ", en: "Calm green", bg: "#eef4ee", card: "#fbfdfb", text: "#14281c", line: "#d5e3d8" },
  sky: { ar: "سماوي فاتح", en: "Sky blue", bg: "#e8f4fb", card: "#fafdff", text: "#0c2233", line: "#cfe5f2" },
  lavender: { ar: "لافندر", en: "Lavender", bg: "#f1eefb", card: "#fcfbff", text: "#241a3d", line: "#ddd5f3" },
  forest: { ar: "أخضر غامق", en: "Deep forest", bg: "#08140d", card: "#0f2318", text: "#e6f4ea", line: "#1d3a2a" },
  wine: { ar: "عنابي ليلي", en: "Wine night", bg: "#160a12", card: "#241220", text: "#f6e9f0", line: "#3d2236" },
  graphite: { ar: "رمادي داكن", en: "Graphite", bg: "#121212", card: "#1e1e1e", text: "#ececec", line: "#333333" },
  amoled: { ar: "أسود كامل", en: "Pure black", bg: "#000000", card: "#0b0b0b", text: "#f5f5f5", line: "#262626" },
};

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
  account,
}: {
  lang: Lang;
  cities: City[];
  initialSection: SectionId;
  account: AccountInfo | null;
}) {
  const router = useRouter();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [font, setFont] = useState<FontSize>("");
  const [contrast, setContrast] = useState(false);
  const [simple, setSimple] = useState(false);
  const [theme, setTheme] = useState<ScreenMode>("light");
  const [primary, setPrimary] = useState<string>(DEFAULT_PRIMARY);

  // نقرأ القيم المحفوظة بعد التحميل (localStorage غير متاح على الخادم)،
  // ونعيد قراءتها إذا تغيّرت من تبويب آخر أو من زر المظهر في الترويسة
  useEffect(() => {
    const load = () => {
      const f = readPref(PREF_KEYS.font);
      setFont(f === "large-text" || f === "xlarge-text" ? f : "");
      setContrast(readPref(PREF_KEYS.contrast) === "1");
      setSimple(readPref(PREF_KEYS.simple) === "1");
      setTheme(parseScreenMode(readPref(PREF_KEYS.theme)));
      setPrimary(readPref(PREF_KEYS.primary, DEFAULT_PRIMARY).toLowerCase());
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
              <div className="mode-picker" role="group" aria-label={t(lang, "وضع الشاشة", "Screen mode")}>
                {SCREEN_MODES.map((mode) => {
                  const meta = MODE_META[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`mode-card${theme === mode ? " active" : ""}`}
                      aria-pressed={theme === mode}
                      onClick={() => {
                        setTheme(mode);
                        update(PREF_KEYS.theme, mode === "light" ? null : mode);
                      }}
                    >
                      <span className="mode-swatch" style={{ background: meta.bg, borderColor: meta.line }} aria-hidden="true">
                        <span style={{ background: meta.card, borderColor: meta.line }} />
                        <span style={{ background: meta.text }} />
                      </span>
                      <span>{t(lang, meta.ar, meta.en)}</span>
                    </button>
                  );
                })}
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
            {account ? (
              <AccountForm lang={lang} account={account} cities={cities} />
            ) : (
              <div className="setting-group">
                <p className="setting-desc">
                  {t(
                    lang,
                    "ما سجلتش دخولك. التسجيل اختياري، ويعرض لك الخدمات اللي تخصك كمواطن أو مقيم أجنبي.",
                    "You're not signed in. Signing in is optional and shows the services that apply to you.",
                  )}
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <Link href="/login" className="btn-primary">
                    {t(lang, "تسجيل الدخول", "Sign in")}
                  </Link>
                  <Link href="/register" className="btn-outline">
                    {t(lang, "إنشاء حساب", "Create account")}
                  </Link>
                </div>
              </div>
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
