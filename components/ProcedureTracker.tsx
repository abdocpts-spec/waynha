"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { t, type Lang } from "@/lib/i18n";
import { LAST_STAGE, STAGES } from "@/lib/progress/stages";
import {
  deleteProcedureFile,
  saveProcedureDetails,
  setProcedureStage,
  startProcedure,
  stopProcedure,
  submitForReview,
} from "@/lib/progress/actions";

export type ReviewState = "NONE" | "PENDING" | "NEEDS_CHANGES" | "APPROVED";

export type TrackerData = {
  stage: number;
  /** تاريخ بلوغ كل مرحلة (ISO) بمفتاح رقم المرحلة */
  stageDates: Record<string, string>;
  /** yyyy-mm-dd أو فارغ */
  reminder: string;
  note: string;
  review: ReviewState;
  /** ملاحظة الأدمن عند طلب التعديل */
  reviewNote: string;
  files: { id: number; name: string; size: number }[];
  /** المستندات المطلوبة للخدمة (للتذكير فقط) */
  requiredDocs: string[];
};

function shortDate(iso: string, lang: Lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(lang === "ar" ? "ar-LY" : lang, { day: "numeric", month: "long", numberingSystem: "latn" });
}

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** زر «ابدأ هذا الإجراء» في ترويسة صفحة الخدمة. */
export function StartProcedureButton({ serviceId, lang }: { serviceId: string; lang: Lang }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={pending}
      onClick={() => start(() => startProcedure(serviceId))}
      style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
    >
      🚀 {t(lang, "ابدأ هذا الإجراء", "Start this procedure")}
    </button>
  );
}

/** شريط مراحل الإجراء. المراحل يحدّدها المستخدم، ومرحلة المستندات تُراجَع من فريق وينها. */
export default function ProcedureTracker({ lang, serviceId, data }: { lang: Lang; serviceId: string; data: TrackerData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reminder, setReminder] = useState(data.reminder);
  const [note, setNote] = useState(data.note);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const { stage, review } = data;
  const approved = review === "APPROVED";
  const editable = review === "NONE" || review === "NEEDS_CHANGES";
  const label = (n: number) => {
    const s = STAGES[n - 1];
    return t(lang, s.ar, s.en);
  };
  const go = (n: number) => start(() => setProcedureStage(serviceId, n));
  const dirty = reminder !== data.reminder || note !== data.note;

  const upload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.set("serviceId", serviceId);
      body.set("file", file);
      const res = await fetch("/api/procedure-files", { method: "POST", body });
      if (res.ok) router.refresh();
      else {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        setUploadError(
          {
            type: t(lang, "الأنواع المسموحة: JPG أو PNG أو PDF.", "Allowed types: JPG, PNG or PDF."),
            size: t(lang, "حجم الملف أقصاه 4 ميغابايت.", "Maximum file size is 4 MB."),
            limit: t(lang, "وصلت للحد الأقصى (10 ملفات).", "You reached the limit (10 files)."),
            locked: t(lang, "الملفات مقفلة الآن.", "Files are locked right now."),
            rate: t(lang, "محاولات كثيرة، استنى دقيقة.", "Too many uploads, wait a minute."),
          }[error ?? ""] ?? t(lang, "تعذّر رفع الملف.", "Couldn't upload the file."),
        );
      }
    } catch {
      setUploadError(t(lang, "تعذّر رفع الملف.", "Couldn't upload the file."));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const reviewTag =
    review === "PENDING"
      ? { cls: "warn", text: t(lang, "⏳ قيد المراجعة", "⏳ Under review") }
      : review === "NEEDS_CHANGES"
        ? { cls: "danger", text: t(lang, "⚠️ يحتاج تعديل", "⚠️ Needs changes") }
        : review === "APPROVED"
          ? { cls: "ok", text: t(lang, "✓ راجعها فريق وينها", "✓ Reviewed by WAYNHA") }
          : null;

  return (
    <div className="content-card tracker" id="tracker">
      <div className="tracker-head">
        <h2 className="content-title" style={{ margin: 0 }}>
          📍 {t(lang, "تتبّع إجراءك", "Track your procedure")}
        </h2>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {reviewTag && <span className={`tracker-tag ${reviewTag.cls}`}>{reviewTag.text}</span>}
          <span className={`tracker-tag${stage === LAST_STAGE ? " done" : ""}`}>{label(stage)}</span>
        </span>
      </div>

      <ol className="tracker-steps">
        {STAGES.map((s) => {
          const state = s.n < stage || stage === LAST_STAGE ? "done" : s.n === stage ? "now" : "";
          const date = data.stageDates[String(s.n)];
          return (
            <li key={s.n} className={`tracker-step ${state}`}>
              <button
                type="button"
                className="tracker-dot"
                disabled={pending || (s.n >= 3 && !approved)}
                onClick={() => go(s.n)}
                aria-label={label(s.n)}
                aria-current={s.n === stage ? "step" : undefined}
              >
                {state === "done" ? "✓" : s.n}
              </button>
              <div className="tracker-label">{label(s.n)}</div>
              <div className="tracker-date">{s.n === stage && stage !== LAST_STAGE ? t(lang, "الآن", "Now") : date ? shortDate(date, lang) : " "}</div>
            </li>
          );
        })}
      </ol>

      {stage === 2 && (
        <div className="tracker-docs">
          <h3 className="tracker-docs-title">📎 {t(lang, "مستنداتك للمراجعة", "Your documents for review")}</h3>

          {review === "PENDING" && (
            <div className="review-banner warn">
              ⏳ {t(lang, "أرسلتَ ملفاتك. فريق وينها يراجعها الآن، وستصلك النتيجة هنا.", "Your files were sent. The WAYNHA team is reviewing them; the result will appear here.")}
            </div>
          )}
          {review === "NEEDS_CHANGES" && (
            <div className="review-banner danger" role="alert">
              ⚠️ {t(lang, "طلب فريق وينها تعديلاً:", "The WAYNHA team asked for a change:")} <strong>{data.reviewNote}</strong>
              <div style={{ marginTop: 6 }}>{t(lang, "عدّل ملفاتك ثم أرسلها للمراجعة من جديد.", "Update your files, then send them for review again.")}</div>
            </div>
          )}
          {approved && (
            <div className="review-banner ok">
              ✓ {t(lang, "راجع فريق وينها مستنداتك واكتملت. يمكنك الانتقال للمرحلة التالية.", "The WAYNHA team reviewed your documents and they're complete. You can move to the next stage.")}
            </div>
          )}

          {data.requiredDocs.length > 0 && (
            <details className="tracker-required">
              <summary>{t(lang, "المستندات المطلوبة (للتذكير)", "Required documents (reminder)")}</summary>
              <ul>
                {data.requiredDocs.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </details>
          )}

          <ul className="file-list">
            {data.files.map((f) => (
              <li key={f.id}>
                <a href={`/api/procedure-files/${f.id}`} target="_blank" rel="noopener noreferrer" translate="no">
                  📄 {f.name}
                </a>
                <small>{kb(f.size)}</small>
                {editable && (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={pending}
                    onClick={() => start(() => deleteProcedureFile(f.id))}
                    aria-label={t(lang, `حذف ${f.name}`, `Delete ${f.name}`)}
                  >
                    {t(lang, "حذف", "Delete")}
                  </button>
                )}
              </li>
            ))}
            {data.files.length === 0 && <li className="list-empty">{t(lang, "لم ترفع أي ملف بعد.", "No files uploaded yet.")}</li>}
          </ul>

          {editable && (
            <>
              <label className="upload-btn">
                {uploading ? t(lang, "جاري الرفع…", "Uploading…") : `＋ ${t(lang, "رفع ملف", "Upload a file")}`}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  disabled={uploading || data.files.length >= 10}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
              </label>
              <small className="form-hint" style={{ display: "block", marginTop: 6 }}>
                {t(lang, "JPG أو PNG أو PDF، حتى 4 ميغابايت للملف و10 ملفات.", "JPG, PNG or PDF, up to 4 MB per file and 10 files.")}
              </small>
              {uploadError && (
                <p className="form-error" role="alert">
                  {uploadError}
                </p>
              )}
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending || data.files.length === 0}
                  onClick={() => start(() => submitForReview(serviceId))}
                >
                  {t(lang, "إرسال للمراجعة", "Send for review")} →
                </button>
              </div>
            </>
          )}
          <p className="tracker-note">
            🔒 {t(lang, "ملفاتك لا يراها إلا أنت وفريق مراجعة وينها. تُحذف عند إلغاء المتابعة.", "Only you and the WAYNHA review team can see your files. They're deleted when you stop tracking.")}
          </p>
        </div>
      )}

      <div className="tracker-hint">
        <span>
          {stage === 2 && !approved
            ? `🔒 ${t(lang, "المرحلة التالية تُفتح بعد مراجعة وينها", "The next stage opens after WAYNHA's review")}`
            : data.reminder
              ? `🔔 ${t(lang, "تذكير بالمراجعة يوم", "Review reminder on")} ${shortDate(`${data.reminder}T12:00:00Z`, lang)}`
              : stage === LAST_STAGE
                ? `🎉 ${t(lang, "اكتمل الإجراء", "Procedure completed")}`
                : `🔔 ${t(lang, "لم تحدّد تذكيراً بعد", "No reminder set yet")}`}
        </span>
        {stage < LAST_STAGE && (stage !== 2 || approved) && (
          <button type="button" className="btn-primary" disabled={pending} onClick={() => go(stage + 1)}>
            {stage === LAST_STAGE - 1
              ? `${t(lang, "تم الاستلام", "Received")} ✓`
              : t(lang, `المرحلة التالية: ${label(stage + 1)}`, `Next: ${label(stage + 1)}`)}
          </button>
        )}
      </div>

      <details className="tracker-details">
        <summary>📝 {t(lang, "تذكير وملاحظات", "Reminder and notes")}</summary>
        <div className="tracker-form">
          <label className="form-label" htmlFor="tr-reminder">
            {t(lang, "تاريخ التذكير", "Reminder date")}
          </label>
          <input
            id="tr-reminder"
            type="date"
            className="form-input"
            value={reminder}
            onChange={(e) => {
              setReminder(e.target.value);
              setSaved(false);
            }}
          />
          <label className="form-label" htmlFor="tr-note" style={{ marginTop: 12 }}>
            {t(lang, "ملاحظاتك (رقم الطلب، كلام الموظف…)", "Your notes (request number, what the clerk said…)")}
          </label>
          <textarea
            id="tr-note"
            className="form-input"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
          />
          <div className="tracker-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={pending || !dirty}
              onClick={() =>
                start(async () => {
                  await saveProcedureDetails(serviceId, reminder, note);
                  setSaved(true);
                })
              }
            >
              {t(lang, "حفظ", "Save")}
            </button>
            {saved && <span role="status">✓ {t(lang, "تم الحفظ", "Saved")}</span>}
            <button
              type="button"
              className="link-btn"
              disabled={pending}
              onClick={() => {
                if (
                  window.confirm(
                    t(
                      lang,
                      "إلغاء متابعة هذا الإجراء؟ سيُحذف تقدّمك وملاحظاتك وملفاتك.",
                      "Stop tracking this procedure? Your progress, notes and files will be deleted.",
                    ),
                  )
                )
                  start(() => stopProcedure(serviceId));
              }}
            >
              {t(lang, "إلغاء المتابعة", "Stop tracking")}
            </button>
          </div>
        </div>
      </details>

      <p className="tracker-note">ℹ️ {t(lang, "هذه حالتك كما سجّلتها أنت، وليست حالة رسمية من الجهة. مراجعة وينها للمستندات ليست قبولاً رسمياً.", "This is your status as you recorded it, not an official status from the authority. WAYNHA's document review is not an official acceptance.")}</p>
    </div>
  );
}
