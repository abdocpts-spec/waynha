import Link from "next/link";
import { setReportStatus } from "@/lib/admin/actions";
import { REPORT_KIND, REPORT_STATUS, REPORT_TRANSITIONS } from "@/lib/admin/labels";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { ReportStatus } from "@/lib/generated/prisma/enums";

const STATUSES = Object.keys(REPORT_STATUS) as ReportStatus[];

export default async function AdminReports({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string }>;
}) {
  const { status, service } = await searchParams;
  const filter = STATUSES.includes(status as ReportStatus) ? (status as ReportStatus) : undefined;
  const reports = await prisma.report.findMany({
    where: { ...(filter ? { status: filter } : {}), ...(service ? { serviceId: service } : {}) },
    include: { service: { select: { id: true, titleAr: true, status: true } }, user: { select: { name: true, role: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">بلاغات المستخدمين</h1>
          <div className="date-text">جديد ← قيد المراجعة (تُعلَّم الخدمة «تحتاج تحديث») ← تم التصحيح أو مرفوض</div>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <Link href="/admin/reports" className={`chip${!filter ? " active" : ""}`}>
          الكل
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}`} className={`chip${filter === s ? " active" : ""}`}>
            {REPORT_STATUS[s].label}
          </Link>
        ))}
      </div>

      <div className="admin-list">
        {reports.length === 0 && <div className="list-empty">لا توجد بلاغات هنا.</div>}
        {reports.map((r) => (
          <div key={r.id} className="dash-card admin-row">
            <div className="admin-row-main">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                <span className={`pill pill-${REPORT_STATUS[r.status].tone}`}>{REPORT_STATUS[r.status].label}</span>
                <span className="pill pill-gray">{REPORT_KIND[r.kind]}</span>
                <span className="list-item-sub">#{r.id} · {formatDate(r.createdAt.toISOString(), "ar")}</span>
              </div>
              <div className="list-item-title">
                {r.service ? (
                  <Link href={`/admin/services/${r.service.id}`}>{r.service.titleAr}</Link>
                ) : (
                  "خدمة محذوفة"
                )}
              </div>
              <p className="report-message">{r.message}</p>
              <div className="list-item-sub">
                من: {r.user ? `${r.user.name} (${r.user.role === "FOREIGNER" ? "أجنبي" : r.user.role === "ADMIN" ? "أدمن" : "مواطن"})` : "زائر"}
                {r.adminNote && ` · ملاحظة الأدمن: ${r.adminNote}`}
              </div>
            </div>
            <div className="admin-row-actions">
              {REPORT_TRANSITIONS[r.status].map((tr) => (
                <form key={tr.to} action={setReportStatus} className="inline-form">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value={tr.to} />
                  {(tr.to === "RESOLVED" || tr.to === "REJECTED") && (
                    <input name="note" className="setting-input admin-select" placeholder="ملاحظة (اختياري)" maxLength={500} />
                  )}
                  <button type="submit" className={`btn-option${tr.to === "RESOLVED" ? " active" : ""}`}>
                    {tr.label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
