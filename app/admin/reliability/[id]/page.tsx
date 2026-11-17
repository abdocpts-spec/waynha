import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewForm, ScheduleForm, SourceForm } from "@/components/admin/ReliabilityForms";
import { AUDIT_LABEL, FIELD_LABEL, REASON_LABEL, REPORT_KIND, REPORT_STATUS } from "@/lib/admin/labels";
import { deleteSource, recheckSource } from "@/lib/admin/reliability";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { computeReliability, RELIABILITY_META, SOURCE_TYPE_LABEL } from "@/lib/reliability";

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
const LINK = { OK: ["يعمل", "green"], BROKEN: ["لا يعمل — لا يُعرض للزوار", "red"], UNCHECKED: ["لم يُفحص / تعذّر الحكم", "gray"] } as const;

type Json = Record<string, unknown>;

function describe(action: string, raw: unknown): string {
  const c = (raw && typeof raw === "object" ? raw : {}) as Json;
  const parts: string[] = [];
  if (Array.isArray(c.fields)) parts.push(`الحقول: ${(c.fields as string[]).map((f) => FIELD_LABEL[f] ?? f).join("، ")}`);
  if (Array.isArray(c.status)) parts.push(`المرحلة: ${String(c.status[0] ?? "—")} ← ${String(c.status[1])}`);
  if (Array.isArray(c.nextReviewAt)) parts.push(`الموعد: ${String(c.nextReviewAt[0] ?? "—")} ← ${String(c.nextReviewAt[1] ?? "—")}`);
  else if (typeof c.nextReviewAt === "string") parts.push(`الموعد القادم: ${c.nextReviewAt}`);
  if (Array.isArray(c.reviewIntervalDays)) parts.push(`المدة: ${String(c.reviewIntervalDays[0] ?? "—")} ← ${String(c.reviewIntervalDays[1] ?? "—")} يوم`);
  if (action === "REPORT") parts.push(`بلاغ #${String(c.reportId)} → ${String(c.status)}`);
  if (typeof c.linkStatus === "string") parts.push(`الرابط: ${c.linkStatus}`);
  if (typeof c.title === "string") parts.push(c.title);
  return parts.join(" · ");
}

export default async function AdminReliabilityService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      category: { select: { titleAr: true, reviewIntervalDays: true } },
      sources: { orderBy: { id: "asc" } },
      reports: { where: { status: { in: ["NEW", "IN_REVIEW"] } }, orderBy: { createdAt: "desc" }, take: 20 },
      reviewedBy: { select: { name: true } },
    },
  });
  if (!service) notFound();
  const audits = await prisma.serviceAudit.findMany({ where: { serviceId: id }, orderBy: { createdAt: "desc" }, take: 100 });

  const r = computeReliability({ ...service, reports: service.reports });
  const meta = RELIABILITY_META[r.status];

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">
            {service.icon} {service.titleAr}
          </h1>
          <div className="date-text">
            <Link href="/admin/reliability">← إدارة الموثوقية</Link> · <Link href={`/services/${service.id}`}>عرض الصفحة العامة</Link> ·{" "}
            <Link href={`/admin/services/${service.id}`}>تعديل المحتوى</Link>
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span className={`pill pill-${meta.tone}`}>
            {meta.icon} {meta.ar}
          </span>
          {r.dueSoon && <span className="pill pill-amber">⏳ يقترب موعد المراجعة</span>}
        </div>
        <p style={{ margin: "0 0 6px" }}>{meta.descAr}</p>
        <div className="list-item-sub">
          {r.reasons.length > 0 && <>السبب: {r.reasons.map((x) => REASON_LABEL[x]).join("، ")} · </>}
          {r.reviewed && service.lastReviewedAt
            ? `آخر مراجعة: ${formatDate(service.lastReviewedAt.toISOString(), "ar")} بواسطة ${service.reviewedBy?.name ?? "—"}`
            : "لا توجد مراجعة فعلية مسجّلة"}
          {r.dueAt && ` · الموعد القادم: ${formatDate(r.dueAt.toISOString(), "ar")}`}
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 className="dash-card-title" style={{ marginBottom: 12 }}>📚 مصادر المعلومات ({service.sources.length})</h2>
        {service.sources.length === 0 && <p className="list-empty">لا مصادر. أضف مصدراً — بدونه لا يمكن تسجيل مراجعة.</p>}
        {service.sources.map((s) => {
          const [linkText, linkTone] = LINK[s.linkStatus];
          return (
            <details key={s.id} className="dash-card" style={{ marginBottom: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {s.name} <span className="list-item-sub">· {SOURCE_TYPE_LABEL[s.type]?.ar}</span>
                {s.accessedAt && <span className="list-item-sub"> · اطُّلع عليه {formatDate(s.accessedAt.toISOString(), "ar")}</span>}
                {s.url && <span className={`pill pill-${linkTone}`} style={{ marginInlineStart: 8 }}>{linkText}</span>}
              </summary>
              <div style={{ marginTop: 12 }}>
                <SourceForm
                  serviceId={service.id}
                  draft={{ id: s.id, name: s.name, nameEn: s.nameEn ?? "", type: s.type, url: s.url ?? "", accessedAt: day(s.accessedAt), note: s.note ?? "" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {s.url && (
                    <form action={recheckSource}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="btn-option">
                        🔄 إعادة فحص الرابط
                      </button>
                    </form>
                  )}
                  <form action={deleteSource}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn-option" style={{ color: "var(--danger)" }}>
                      🗑 حذف المصدر
                    </button>
                  </form>
                </div>
                {s.linkCheckedAt && <p className="list-item-sub">آخر فحص للرابط: {formatDate(s.linkCheckedAt.toISOString(), "ar")}. نجاح الفحص لا يعني صحة المعلومة.</p>}
              </div>
            </details>
          );
        })}
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--primary)" }}>+ إضافة مصدر جديد</summary>
          <div style={{ marginTop: 12 }}>
            <SourceForm serviceId={service.id} />
          </div>
        </details>
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 className="dash-card-title" style={{ marginBottom: 6 }}>✅ تسجيل مراجعة فعلية</h2>
        <p className="list-item-sub" style={{ marginTop: 0 }}>
          تُسجَّل باسمك وتاريخها الآن، وتدخل سجل المراجعات. هذه مراجعة وينها للمعلومة وليست اعتماداً حكومياً.
        </p>
        <ReviewForm serviceId={service.id} canReview={service.sources.length > 0} defaultInterval={service.reviewIntervalDays ?? service.category.reviewIntervalDays} />
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 className="dash-card-title" style={{ marginBottom: 12 }}>🗓️ جدولة المراجعة</h2>
        <ScheduleForm serviceId={service.id} next={day(service.nextReviewAt)} interval={service.reviewIntervalDays ? String(service.reviewIntervalDays) : ""} />
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 className="dash-card-title" style={{ marginBottom: 12 }}>⚠️ البلاغات المفتوحة ({service.reports.length})</h2>
        {service.reports.length === 0 && <p className="list-empty">لا بلاغات مفتوحة.</p>}
        {service.reports.map((rep) => (
          <div key={rep.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div>
              <span className={`pill pill-${REPORT_STATUS[rep.status].tone}`}>{REPORT_STATUS[rep.status].label}</span>{" "}
              <span className="pill pill-gray">{REPORT_KIND[rep.kind]}</span>{" "}
              <span className="list-item-sub">{formatDate(rep.createdAt.toISOString(), "ar")}</span>
            </div>
            <p className="report-message" style={{ margin: "6px 0 0" }}>{rep.message}</p>
          </div>
        ))}
        <p className="list-item-sub">
          بلاغ جديد واحد لا يغيّر الحالة؛ تتغير عند قبول بلاغ للمراجعة أو وصول بلاغين جديدين. <Link href={`/admin/reports?service=${service.id}`}>إدارة البلاغات ←</Link>
        </p>
      </div>

      <div className="dash-card">
        <h2 className="dash-card-title" style={{ marginBottom: 12 }}>🧾 سجل المراجعات والتعديلات</h2>
        {audits.length === 0 && <p className="list-empty">لا سجل بعد.</p>}
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {audits.map((a) => (
            <li key={a.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <div>
                <strong>{AUDIT_LABEL[a.action] ?? a.action}</strong> · {a.userName} · {formatDate(a.createdAt.toISOString(), "ar")}{" "}
                <span className="list-item-sub" dir="ltr">{a.createdAt.toISOString().slice(11, 16)} UTC</span>
              </div>
              {describe(a.action, a.changes) && <div className="list-item-sub">{describe(a.action, a.changes)}</div>}
              {a.sourceName && <div className="list-item-sub">المصدر: {a.sourceName}</div>}
              {a.note && <div className="list-item-sub">ملاحظة: {a.note}</div>}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
