"use client";

import { useActionState } from "react";
import { logout, updateProfile, type AuthState } from "@/lib/auth/actions";
import { t, type Lang } from "@/lib/i18n";

export type AccountInfo = { name: string; login: string; cityId: string | null; role: "CITIZEN" | "FOREIGNER" | "ADMIN" };
type City = { id: string; nameAr: string; nameEn: string };

const ROLE_LABEL = {
  CITIZEN: ["مواطن ليبي", "Libyan citizen"],
  FOREIGNER: ["مقيم أجنبي", "Foreign resident"],
  ADMIN: ["مدير (أدمن)", "Administrator"],
} as const;

/** إعدادات الحساب الحقيقي (تُحفظ في قاعدة البيانات عبر Server Action). */
export default function AccountForm({ lang, account, cities }: { lang: Lang; account: AccountInfo; cities: City[] }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateProfile, undefined);

  return (
    <>
      <form action={action}>
        <input type="hidden" name="lang" value={lang} />
        <div className="setting-group">
          <span className="setting-field-label">{t(lang, "نوع الحساب", "Account type")}</span>
          <span className="soon-badge" style={{ fontSize: "0.85rem" }}>
            {t(lang, ROLE_LABEL[account.role][0], ROLE_LABEL[account.role][1])}
          </span>
        </div>
        <div className="setting-group">
          <label className="setting-field-label" htmlFor="acc-name">
            {t(lang, "الاسم الكامل", "Full name")}
          </label>
          <input id="acc-name" name="name" className="setting-input" defaultValue={account.name} required maxLength={80} />
        </div>
        <div className="setting-group">
          <label className="setting-field-label" htmlFor="acc-contact">
            {t(lang, "رقم الهاتف أو البريد", "Phone or email")}
          </label>
          <input id="acc-contact" className="setting-input" value={account.login} dir="ltr" readOnly />
        </div>
        <div className="setting-group">
          <label className="setting-field-label" htmlFor="acc-city">
            {t(lang, "المدينة الافتراضية (لعرض أقرب الجهات)", "Default city (to show nearby offices)")}
          </label>
          <select id="acc-city" name="cityId" className="setting-input" defaultValue={account.cityId ?? ""}>
            <option value="">{t(lang, "— اختر مدينة —", "— Choose a city —")}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {lang === "ar" ? city.nameAr : city.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" className="btn-primary" disabled={pending}>
            {t(lang, "حفظ التغييرات", "Save changes")}
          </button>
          {state?.ok && (
            <span role="status" style={{ color: "var(--success)", fontWeight: 600 }}>
              {t(lang, "تم الحفظ ✓", "Saved ✓")}
            </span>
          )}
          {state?.error && (
            <span role="alert" className="form-error" style={{ margin: 0 }}>
              {state.error}
            </span>
          )}
        </div>
      </form>
      <form action={logout} style={{ marginTop: 16 }}>
        <button type="submit" className="btn-outline btn-danger-outline">
          {t(lang, "تسجيل الخروج", "Sign out")}
        </button>
      </form>
    </>
  );
}
