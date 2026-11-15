import Link from "next/link";
import { REPORT_STATUS, ROLE, SERVICE_STATUS } from "@/lib/admin/labels";
import { prisma } from "@/lib/db";

export default async function AdminHome() {
  const [byStatus, byReport, byRole] = await Promise.all([
    prisma.service.groupBy({ by: ["status"], _count: true }),
    prisma.report.groupBy({ by: ["status"], _count: true }),
    prisma.user.groupBy({ by: ["role"], _count: true }),
  ]);
  const statusCount = new Map(byStatus.map((r) => [r.status as string, r._count]));
  const reportCount = new Map(byReport.map((r) => [r.status as string, r._count]));
  const roleCount = new Map(byRole.map((r) => [r.role as string, r._count]));

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">نظرة عامة</h1>
          <div className="date-text">
            الأدمن يعتمد <strong>صحة المعلومات</strong> في وينها، ولا يعتمد معاملات المواطنين؛ وينها منصة إرشادية وليست جهة حكومية.
          </div>
        </div>
        <Link href="/admin/services/new" className="btn-primary">
          + إضافة خدمة
        </Link>
      </div>

      <div className="dash-grid">
        <div className="dash-card">
          <h2 className="dash-card-title" style={{ marginBottom: 16 }}>📋 الخدمات حسب المرحلة</h2>
          <div className="list-group">
            {(Object.keys(SERVICE_STATUS) as (keyof typeof SERVICE_STATUS)[]).map((status) => (
              <Link key={status} href={`/admin/services?status=${status}`} className="list-item">
                <span className={`pill pill-${SERVICE_STATUS[status].tone}`}>{SERVICE_STATUS[status].label}</span>
                <strong>{statusCount.get(status) ?? 0}</strong>
              </Link>
            ))}
          </div>
        </div>
        <div className="dash-card">
          <h2 className="dash-card-title" style={{ marginBottom: 16 }}>⚠️ البلاغات</h2>
          <div className="list-group">
            {(Object.keys(REPORT_STATUS) as (keyof typeof REPORT_STATUS)[]).map((status) => (
              <Link key={status} href={`/admin/reports?status=${status}`} className="list-item">
                <span className={`pill pill-${REPORT_STATUS[status].tone}`}>{REPORT_STATUS[status].label}</span>
                <strong>{reportCount.get(status) ?? 0}</strong>
              </Link>
            ))}
          </div>
        </div>
        <div className="dash-card">
          <h2 className="dash-card-title" style={{ marginBottom: 16 }}>👥 المستخدمون</h2>
          <div className="list-group">
            {(Object.keys(ROLE) as (keyof typeof ROLE)[]).map((role) => (
              <Link key={role} href={`/admin/users?role=${role}`} className="list-item">
                <span>{ROLE[role]}</span>
                <strong>{roleCount.get(role) ?? 0}</strong>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
