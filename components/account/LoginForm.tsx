"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import BrandMark from "@/components/layout/BrandMark";
import { login, signup, type AuthState } from "@/lib/auth/actions";
import { COUNTRY_CODES, DEFAULT_DIAL } from "@/lib/countryCodes";
import { t, type Lang } from "@/lib/i18n";

/**
 * تسجيل الدخول وإنشاء الحساب (نفس واجهة النموذج الأولي، بحسابات حقيقية على الخادم).
 * أنواع الحسابات من الموقع: مواطن أو أجنبي فقط. حساب الأدمن يُنشأ من الخادم.
 */
/** حقل بأيقونة مستقلة على جانبه (bare = بلا أيقونة، لنفس الشكل القديم في تسجيل الدخول). */
function IconField({ icon, bare, children }: { icon: string; bare?: boolean; children: React.ReactNode }) {
  if (bare) return <>{children}</>;
  return (
    <div className="icon-field">
      <span className="icon-field-icon" aria-hidden="true">{icon}</span>
      {children}
    </div>
  );
}

export default function LoginForm({
  lang,
  mode,
  next,
  defaultRole,
}: {
  lang: Lang;
  mode: "login" | "signup";
  next?: string;
  defaultRole?: "CITIZEN" | "FOREIGNER";
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const [role] = useState<"CITIZEN" | "FOREIGNER">(defaultRole ?? (lang === "en" ? "FOREIGNER" : "CITIZEN"));
  const [soon, setSoon] = useState("");
  const comingSoon = (what: string) =>
    setSoon(t(lang, `${what} غير متاح في النسخة الحالية.`, `${what} isn't available in this version yet.`));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <BrandMark size={56} />
          </div>
          <h1 className="auth-title">
            {mode === "login" ? t(lang, "مرحباً بيك في وينها", "Welcome to WAYNHA") : t(lang, "إنشاء حساب جديد", "Create an account")}
          </h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? t(lang, "سجل دخولك لحفظ إجراءاتك ومتابعتها.", "Sign in to save and follow your procedures.")
              : t(lang, "الحساب اختياري، ويعرض لك الخدمات اللي تخصك.", "Optional — it shows the services that apply to you.")}
          </p>
        </div>

        <form action={action}>
          <input type="hidden" name="lang" value={lang} />
          {next && <input type="hidden" name="next" value={next} />}

          {/* نوع الزائر اختاره في صفحة الترحيب، فلا نكرر السؤال هنا */}
          {mode === "signup" && <input type="hidden" name="role" value={role} />}

          {mode === "signup" && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">
                  {t(lang, "الاسم الكامل", "Full name")}
                </label>
                <IconField icon="👤">
                  <input id="auth-name" name="name" className="form-input" placeholder=" " autoComplete="name" required maxLength={80} />
                </IconField>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-login">
                  {t(lang, "رقم الهاتف", "Phone number")}
                </label>
                <div className="phone-row">
                  {role === "FOREIGNER" && (
                    <select
                      name="phoneCode"
                      className="form-input phone-code"
                      defaultValue={DEFAULT_DIAL}
                      dir="ltr"
                      aria-label={t(lang, "مفتاح الدولة", "Country code")}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.dial} value={c.dial}>
                          +{c.dial} {t(lang, c.ar, c.en)}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <IconField icon="📞">
                      <input
                        id="auth-login"
                        name="login"
                        type="tel"
                        inputMode="tel"
                        className="form-input"
                        placeholder={role === "FOREIGNER" ? "XXX XXX XXXX" : "09X XXX XXXX"}
                        autoComplete="tel"
                        dir="ltr"
                        style={{ textAlign: lang === "ar" ? "right" : "left" }}
                        required
                        maxLength={30}
                      />
                    </IconField>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">
                  {t(lang, "البريد الإلكتروني (اختياري)", "Email (optional)")}
                </label>
                <IconField icon="✉️">
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="name@email.com"
                    autoComplete="email"
                    dir="ltr"
                    style={{ textAlign: lang === "ar" ? "right" : "left" }}
                    maxLength={120}
                  />
                </IconField>
              </div>

              {role === "CITIZEN" && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="auth-nid">
                      {t(lang, "الرقم الوطني", "National ID number")}
                    </label>
                    <IconField icon="🪪">
                      <input
                        id="auth-nid"
                        name="nationalId"
                        className="form-input"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="1XXXXXXXXXXX"
                        dir="ltr"
                        style={{ textAlign: lang === "ar" ? "right" : "left" }}
                        required
                        maxLength={20}
                      />
                    </IconField>
                    <small className="form-hint">
                      {t(
                        lang,
                        "12 رقماً. يُحفظ كبصمة مشفّرة ولا يظهر لأي أحد، ولا تتحقق منه وينها مع أي جهة.",
                        "12 digits. Stored only as an encrypted fingerprint, never shown to anyone, and not checked with any authority.",
                      )}
                    </small>
                  </div>
                </>
              )}

              {role === "FOREIGNER" && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-rid">
                    {t(lang, "رقم الإقامة", "Residence permit number")}
                  </label>
                  <input
                    id="auth-rid"
                    name="residenceId"
                    placeholder=" "
                    className="form-input"
                    autoComplete="off"
                    dir="ltr"
                    style={{ textAlign: lang === "ar" ? "right" : "left" }}
                    required
                    maxLength={30}
                  />
                  <small className="form-hint">
                    {t(
                      lang,
                      "يُحفظ كبصمة مشفّرة ولا يظهر لأي أحد، ولا تتحقق منه وينها مع أي جهة.",
                      "Stored only as an encrypted fingerprint, never shown to anyone, and not checked with any authority.",
                    )}
                  </small>
                </div>
              )}
            </>
          )}

          {mode === "login" && (
            <>
              <p className="form-hint" style={{ marginTop: 0 }}>
                {t(lang, "عبّي واحدة فقط من الخانات التالية.", "Fill in any one of the fields below.")}
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-phone">
                  {t(lang, "رقم الهاتف", "Phone number")}
                </label>
                <div className="phone-row">
                  {role === "FOREIGNER" && (
                    <select
                      name="phoneCode"
                      className="form-input phone-code"
                      defaultValue={DEFAULT_DIAL}
                      dir="ltr"
                      aria-label={t(lang, "مفتاح الدولة", "Country code")}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.dial} value={c.dial}>
                          +{c.dial} {t(lang, c.ar, c.en)}
                        </option>
                      ))}
                    </select>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <IconField icon="📞">
                      <input
                        id="auth-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        className="form-input"
                        placeholder={role === "FOREIGNER" ? "XXX XXX XXXX" : "09X XXX XXXX"}
                        autoComplete="tel"
                        dir="ltr"
                        style={{ textAlign: lang === "ar" ? "right" : "left" }}
                        maxLength={30}
                      />
                    </IconField>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">
                  {t(lang, "البريد الإلكتروني", "Email")}
                </label>
                <IconField icon="✉️">
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="name@email.com"
                    autoComplete="email"
                    dir="ltr"
                    style={{ textAlign: lang === "ar" ? "right" : "left" }}
                    maxLength={120}
                  />
                </IconField>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-idnum">
                  {role === "CITIZEN" ? t(lang, "الرقم الوطني", "National ID number") : t(lang, "رقم الإقامة", "Residence permit number")}
                </label>
                <IconField icon="🪪">
                  <input
                    id="auth-idnum"
                    name="idNumber"
                    className="form-input"
                    inputMode={role === "CITIZEN" ? "numeric" : undefined}
                    placeholder={role === "CITIZEN" ? "1XXXXXXXXXXX" : " "}
                    autoComplete="off"
                    dir="ltr"
                    style={{ textAlign: lang === "ar" ? "right" : "left" }}
                    maxLength={30}
                  />
                </IconField>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              {t(lang, "كلمة المرور", "Password")}
            </label>
            <IconField icon="🔒">
              <input
                id="auth-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                maxLength={200}
              />
            </IconField>
            {mode === "signup" && (
              <small className="form-hint">{t(lang, "8 أحرف على الأقل.", "At least 8 characters.")}</small>
            )}
          </div>
          {mode === "signup" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password2">
                {t(lang, "تأكيد كلمة المرور", "Confirm password")}
              </label>
              <IconField icon="🔒">
                <input
                  id="auth-password2"
                  name="confirmPassword"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={200}
                />
              </IconField>
            </div>
          )}

          {mode === "login" && (
            <div className="form-options">
              <span />
              <button type="button" className="link-btn" onClick={() => comingSoon(t(lang, "استرجاع كلمة المرور", "Password reset"))}>
                {t(lang, "نسيت كلمة المرور؟", "Forgot password?")}
              </button>
            </div>
          )}
          {mode === "login" && soon && (
            <p className="form-note" role="status">
              {soon}
            </p>
          )}

          {state?.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}

          <button type="submit" className="btn-primary btn-block" disabled={pending}>
            {pending
              ? t(lang, "لحظة…", "One moment…")
              : mode === "login"
                ? t(lang, "تسجيل الدخول", "Sign in")
                : t(lang, "إنشاء الحساب", "Create account")}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "login" ? (
            <>
              {t(lang, "ليس لديك حساب؟", "No account?")}{" "}
              <Link href="/register">{t(lang, "إنشاء حساب جديد", "Create a new account")}</Link>
            </>
          ) : (
            <>
              {t(lang, "عندك حساب؟", "Have an account?")} <Link href="/login">{t(lang, "سجّل دخولك", "Sign in")}</Link>
            </>
          )}
        </div>

        <p className="auth-privacy">
          {t(
            lang,
            "التسجيل ليس شرطاً لاستخدام وينها. الرقم الوطني ورقم الإقامة وكلمة المرور تُحفظ مشفّرة، ولا نطلب رقم جواز السفر.",
            "Signing in is optional. National ID, residence number and password are stored encrypted, and we never ask for a passport number.",
          )}
        </p>
      </div>
    </div>
  );
}
