import Link from "next/link";
import { setServiceAudience, setServiceStatus } from "@/lib/admin/actions";
import { AUDIENCE, SERVICE_STATUS, SERVICE_TRANSITIONS } from "@/lib/admin/labels";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const STATUSES = Object.keys(SERVICE_STATUS) as ContentStatus[];

export default async function AdminServices({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string }>;
}) {
  const { status, saved } = await searchParams;
  const filter = STATUSES.includes(status as ContentStatus) ? (status as ContentStatus) : undefined;
  const services = await prisma.service.findMany({
    where: filter ? { status: filter } : undefined,
    select: {
      id: true,
      icon: true,
      titleAr: true,
      status: true,
      audience: true,
      isDemo: true,
      lastReviewedAt: true,
      reviewNote: true,
      category: { select: { titleAr: true } },
      _count: { select: { reports: { where: { status: { in: ["NEW", "IN_REVIEW"] } } } } },
    },
    orderBy: [{ status: "asc" }, { titleAr: "asc" }],
  });

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">الخدمات ومراحل الاعتماد</h1>
          <div className="date-text">مسودة ← قيد المراجعة ← معتمدة ومنشورة ← (تحتاج تحديث عند تغيّر المعلومة)</div>
        </div>
        <Link href="/admin/services/new" className="btn-primary">
          + إضافة خدمة
        </Link>
      </div>

      {saved && (
        <p className="auth-privacy" role="status" style={{ textAlign: "start", marginTop: 0, marginBottom: 16 }}>
          ✓ تم حفظ الخدمة «{saved}». الخدمة الجديدة تبدأ مسودة ولا تظهر للزوار حتى تعتمدها.
        </p>
      )}

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <Link href="/admin/services" className={`chip${!filter ? " active" : ""}`}>
          الكل
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/services?status=${s}`} className={`chip${filter === s ? " active" : ""}`}>
            {SERVICE_STATUS[s].label}
          </Link>
        ))}
      </div>

      <div className="admin-list">
        {services.length === 0 && <div className="list-empty">لا توجد خدمات في هذه المرحلة.</div>}
        {services.map((s) => (
          <div key={s.id} className="dash-card admin-row">
            <div className="admin-row-main">
              <div className="list-item-title">
                {s.icon} {s.titleAr}
              </div>
              <div className="list-item-sub">
                {s.category.titleAr} · <code dir="ltr">{s.id}</code>
                {s.isDemo && " · بيانات تجريبية"}
                {s.lastReviewedAt && ` · آخر مراجعة: ${formatDate(s.lastReviewedAt.toISOString(), "ar")}`}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                <span className={`pill pill-${SERVICE_STATUS[s.status].tone}`} title={SERVICE_STATUS[s.status].hint}>
                  {SERVICE_STATUS[s.status].label}
                </span>
                {s._count.reports > 0 && (
                  <Link href={`/admin/reports?service=${s.id}`} className="pill pill-amber">
                    ⚠️ {s._count.reports} بلاغ مفتوح
                  </Link>
                )}
                {s.reviewNote && <span className="list-item-sub">ملاحظة: {s.reviewNote}</span>}
              </div>
            </div>

            <div className="admin-row-actions">
              <form action={setServiceAudience} className="inline-form">
                <input type="hidden" name="id" value={s.id} />
                <label className="list-item-sub" htmlFor={`aud-${s.id}`}>
                  لمن:
                </label>
                <select id={`aud-${s.id}`} name="audience" defaultValue={s.audience} className="setting-input admin-select">
                  {(Object.keys(AUDIENCE) as (keyof typeof AUDIENCE)[]).map((a) => (
                    <option key={a} value={a}>
                      {AUDIENCE[a]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-option">
                  حفظ
                </button>
              </form>
              <div className="btn-group">
                {SERVICE_TRANSITIONS[s.status].map((tr) => (
                  <form key={tr.to} action={setServiceStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value={tr.to} />
                    <button type="submit" className={`btn-option${tr.to === "PUBLISHED" ? " active" : ""}`}>
                      {tr.label}
                    </button>
                  </form>
                ))}
                <Link href={`/admin/services/${s.id}`} className="btn-option">
                  ✏️ تعديل
                </Link>
                {(s.status === "PUBLISHED" || s.status === "NEEDS_UPDATE") && (
                  <Link href={`/services/${s.id}`} className="btn-option" target="_blank">
                    عرض
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
