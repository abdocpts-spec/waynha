"use client";

import { useActionState, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { submitReport, type ReportState } from "@/lib/reports/actions";

const KINDS = [
  ["PHONE", "رقم الهاتف", "Phone number"],
  ["LOCATION", "الموقع", "Location"],
  ["OUTDATED", "معلومة قديمة", "Outdated"],
  ["MISSING", "ناقصة", "Missing info"],
  ["OTHER", "أخرى", "Other"],
] as const;

/** «في معلومة غلط؟» في صفحة الخدمة. يرسل بلاغاً لفريق وينها للمراجعة. */
export default function ReportForm({ serviceId, lang }: { serviceId: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("");
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, undefined);

  if (state?.ok) {
    return (
      <div className="content-card report-card" role="status">
        <strong>✓ {t(lang, "وصل بلاغك، شكراً!", "Report received, thank you!")}</strong>
        <p className="setting-desc" style={{ margin: "6px 0 0" }}>
          {t(lang, "فريق وينها بيراجع المعلومة ويصححها إذا لزم.", "The WAYNHA team will review and correct it if needed.")}
        </p>
      </div>
    );
  }

  return (
    <div className="content-card report-card">
      {!open ? (
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>
          ⚠️ {t(lang, "في معلومة غلط في هذي الصفحة؟ بلّغنا", "Something wrong on this page? Report it")}
        </button>
      ) : (
        <form action={action}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="kind" value={kind} />
          <div className="setting-label">{t(lang, "شن المشكلة؟", "What's wrong?")}</div>
          <div className="btn-group" style={{ marginBottom: 12 }}>
            {KINDS.map(([value, ar, en]) => (
              <button
                key={value}
                type="button"
                className={`btn-option${kind === value ? " active" : ""}`}
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
              >
                {t(lang, ar, en)}
              </button>
            ))}
          </div>
          <label className="setting-field-label" htmlFor={`report-${serviceId}`}>
            {t(lang, "وصف المشكلة", "Describe the problem")}
          </label>
          <textarea
            id={`report-${serviceId}`}
            name="message"
            className="setting-input"
            style={{ maxWidth: "100%", minHeight: 90, resize: "vertical" }}
            maxLength={1000}
            required
            placeholder={t(lang, "مثلاً: الرقم ما يرد، الرقم الصحيح هو…", "e.g. the phone doesn't answer, the right number is…")}
          />
          {state?.error && (
            <p className="form-error" role="alert" style={{ marginTop: 8 }}>
              {state.error}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn-primary" disabled={pending}>
              {t(lang, "إرسال البلاغ", "Send report")}
            </button>
            <button type="button" className="link-btn" onClick={() => setOpen(false)}>
              {t(lang, "إلغاء", "Cancel")}
            </button>
            <span className="setting-desc" style={{ margin: 0 }}>
              {t(lang, "يوصل لفريق وينها للمراجعة. لا تكتب بيانات شخصية.", "Goes to the WAYNHA team. Don't include personal data.")}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
