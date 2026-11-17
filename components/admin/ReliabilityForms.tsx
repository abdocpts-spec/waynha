"use client";

import { useActionState } from "react";
import {
  addSource,
  recordReview,
  setSchedule,
  updateSource,
  type ReliabilityFormState,
} from "@/lib/admin/reliability";

const TYPES = [
  ["OFFICIAL_WEBSITE", "موقع رسمي للجهة"],
  ["OFFICIAL_DOCUMENT", "وثيقة أو قرار رسمي"],
  ["OFFICE_VISIT", "زيارة ميدانية للجهة"],
  ["PHONE_CALL", "اتصال بالجهة"],
  ["ANNOUNCEMENT", "إعلان منشور"],
  ["OTHER", "مصدر آخر"],
] as const;

function Msg({ state }: { state: ReliabilityFormState }) {
  if (state?.error)
    return (
      <p role="alert" style={{ color: "var(--danger)", fontWeight: 700, margin: 0 }}>
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" style={{ color: "var(--success)", fontWeight: 700, margin: 0 }}>
        ✓ {state.ok}
      </p>
    );
  return null;
}

export type SourceDraft = {
  id?: number;
  name: string;
  nameEn: string;
  type: string;
  url: string;
  accessedAt: string;
  note: string;
};

/** إضافة مصدر أو تعديله. إضافة المصدر لا تمنح الخدمة حالة «تمت المراجعة». */
export function SourceForm({ serviceId, draft }: { serviceId: string; draft?: SourceDraft }) {
  const [state, action, pending] = useActionState<ReliabilityFormState, FormData>(draft?.id ? updateSource : addSource, undefined);
  const d: SourceDraft = draft ?? { name: "", nameEn: "", type: "OFFICIAL_WEBSITE", url: "", accessedAt: "", note: "" };
  return (
    <form action={action} className="office-form" key={draft?.id ?? "new"}>
      <input type="hidden" name="serviceId" value={serviceId} />
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <div className="grid-2">
        <label>
          اسم المصدر (عربي)
          <input name="name" className="form-input" defaultValue={d.name} required dir="rtl" />
        </label>
        <label>
          Source name (English)
          <input name="nameEn" className="form-input" defaultValue={d.nameEn} dir="ltr" />
        </label>
        <label>
          نوع المصدر
          <select name="type" className="form-input" defaultValue={d.type}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ الاطلاع على المصدر
          <input type="date" name="accessedAt" className="form-input" defaultValue={d.accessedAt} dir="ltr" />
        </label>
      </div>
      <label>
        رابط المصدر (اختياري — يُفحص تلقائياً، وغير الصالح لا يُعرض للزوار)
        <input name="url" className="form-input" defaultValue={d.url} dir="ltr" placeholder="https://" inputMode="url" />
      </label>
      <label>
        ملاحظات الإدارة (داخلية، لا تظهر للزوار)
        <textarea name="note" className="form-input" rows={2} defaultValue={d.note} maxLength={500} />
      </label>
      <Msg state={state} />
      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : d.id ? "حفظ المصدر" : "+ إضافة المصدر"}
        </button>
      </div>
    </form>
  );
}

/** تسجيل مراجعة فعلية باسم الأدمن الحالي. هذا هو الطريق الوحيد لحالة «تمت المراجعة». */
export function ReviewForm({
  serviceId,
  canReview,
  defaultInterval,
}: {
  serviceId: string;
  canReview: boolean;
  defaultInterval: number;
}) {
  const [state, action, pending] = useActionState<ReliabilityFormState, FormData>(recordReview, undefined);
  return (
    <form action={action} className="office-form">
      <input type="hidden" name="serviceId" value={serviceId} />
      <label>
        ملاحظة المراجعة (ماذا راجعت وعلى أي مصدر؟)
        <textarea name="note" className="form-input" rows={2} required minLength={3} maxLength={500} />
      </label>
      <div className="grid-2">
        <label>
          موعد المراجعة القادمة (اتركه فارغاً لحسابه من المدة)
          <input type="date" name="nextReviewAt" className="form-input" dir="ltr" />
        </label>
        <label>
          مدة المراجعة بالأيام (الافتراضي للقسم: {defaultInterval})
          <input type="number" name="intervalDays" className="form-input" min={7} max={1095} dir="ltr" placeholder={String(defaultInterval)} />
        </label>
      </div>
      {!canReview && <p style={{ margin: 0, color: "var(--warning)" }}>أضف مصدراً واحداً على الأقل قبل تسجيل المراجعة.</p>}
      <Msg state={state} />
      <div>
        <button type="submit" className="btn-primary" disabled={pending || !canReview}>
          {pending ? "جارٍ التسجيل…" : "✓ تسجيل مراجعة فعلية باسمي"}
        </button>
      </div>
    </form>
  );
}

export function ScheduleForm({ serviceId, next, interval }: { serviceId: string; next: string; interval: string }) {
  const [state, action, pending] = useActionState<ReliabilityFormState, FormData>(setSchedule, undefined);
  return (
    <form action={action} className="office-form">
      <input type="hidden" name="serviceId" value={serviceId} />
      <div className="grid-2">
        <label>
          موعد المراجعة القادمة
          <input type="date" name="nextReviewAt" className="form-input" defaultValue={next} dir="ltr" />
        </label>
        <label>
          مدة مراجعة خاصة بالأيام (فارغ = مدة القسم)
          <input type="number" name="intervalDays" className="form-input" min={7} max={1095} defaultValue={interval} dir="ltr" />
        </label>
      </div>
      <Msg state={state} />
      <div>
        <button type="submit" className="btn-outline" disabled={pending}>
          حفظ الجدولة
        </button>
      </div>
    </form>
  );
}
