"use client";

import { useActionState } from "react";
import { saveService, type ServiceFormState } from "@/lib/admin/actions";
import { AUDIENCE } from "@/lib/admin/labels";

export type ServiceDraft = Record<
  | "id" | "categoryId" | "icon" | "audience"
  | "titleAr" | "titleEn" | "shortDescAr" | "shortDescEn" | "departmentAr" | "departmentEn"
  | "feesAr" | "feesEn" | "durationAr" | "durationEn" | "hoursAr" | "hoursEn"
  | "eligibilityAr" | "eligibilityEn" | "sourceAr" | "sourceEn"
  | "stepsAr" | "stepsEn" | "documentsAr" | "documentsEn" | "notesAr" | "notesEn" | "keywords",
  string
>;

function Pair({ name, label, draft, area, required }: { name: string; label: string; draft: ServiceDraft; area?: boolean; required?: boolean }) {
  const ar = `${name}Ar` as keyof ServiceDraft;
  const en = `${name}En` as keyof ServiceDraft;
  const Field = area ? "textarea" : "input";
  return (
    <div className="editor-pair">
      <label className="setting-field-label">
        {label} (عربي)
        <Field name={ar} defaultValue={draft[ar]} className="setting-input editor-input" required={required} dir="rtl" />
      </label>
      <label className="setting-field-label">
        {label} (English)
        <Field name={en} defaultValue={draft[en]} className="setting-input editor-input" required={required} dir="ltr" />
      </label>
    </div>
  );
}

/** نموذج إضافة/تعديل خدمة بالعربي والإنجليزي. القوائم (الخطوات، المستندات…) سطر لكل عنصر. */
export default function ServiceEditor({
  draft,
  isNew,
  categories,
}: {
  draft: ServiceDraft;
  isNew: boolean;
  categories: { id: string; titleAr: string }[];
}) {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(saveService, undefined);

  return (
    <form action={action} className="dash-card editor">
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />
      {!isNew && <input type="hidden" name="id" value={draft.id} />}

      <div className="editor-grid">
        {isNew && (
          <label className="setting-field-label">
            المعرّف (بالإنجليزي، يظهر في الرابط)
            <input name="id" className="setting-input editor-input" dir="ltr" placeholder="residence-permit" required pattern="[a-z0-9][a-z0-9\-]{1,60}" />
          </label>
        )}
        <label className="setting-field-label">
          التصنيف
          <select name="categoryId" defaultValue={draft.categoryId} className="setting-input editor-input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titleAr}
              </option>
            ))}
          </select>
        </label>
        <label className="setting-field-label">
          لمن هذه الخدمة؟
          <select name="audience" defaultValue={draft.audience} className="setting-input editor-input">
            {(Object.keys(AUDIENCE) as (keyof typeof AUDIENCE)[]).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="setting-field-label">
          أيقونة
          <input name="icon" defaultValue={draft.icon} className="setting-input editor-input" maxLength={8} />
        </label>
      </div>

      <Pair name="title" label="اسم الخدمة" draft={draft} required />
      <Pair name="shortDesc" label="وصف قصير" draft={draft} area />
      <Pair name="department" label="الجهة المختصة" draft={draft} />
      <Pair name="fees" label="الرسوم" draft={draft} />
      <Pair name="duration" label="المدة" draft={draft} />
      <Pair name="hours" label="أوقات الدوام" draft={draft} />
      <Pair name="eligibility" label="شروط الأهلية" draft={draft} area />
      <Pair name="source" label="مصدر المعلومة" draft={draft} />

      <p className="setting-desc" style={{ marginTop: 8 }}>القوائم التالية: سطر لكل عنصر، وبنفس الترتيب في العربي والإنجليزي.</p>
      <Pair name="steps" label="الخطوات" draft={draft} area />
      <Pair name="documents" label="المستندات المطلوبة" draft={draft} area />
      <Pair name="notes" label="ملاحظات" draft={draft} area />

      <label className="setting-field-label">
        كلمات البحث (سطر لكل كلمة، ويُفضّل إضافة صيغ اللهجة الليبية)
        <textarea name="keywords" defaultValue={draft.keywords} className="setting-input editor-input" />
      </label>

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "جاري الحفظ…" : isNew ? "حفظ كمسودة" : "حفظ التعديلات"}
      </button>
    </form>
  );
}
