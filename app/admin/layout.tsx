import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة | وينها",
};

/** كل صفحات /admin للأدمن فقط: يُتحقق من الجلسة على الخادم قبل عرض أي شيء. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const newReports = await prisma.report.count({ where: { status: "NEW" } });

  return (
    <div className="dashboard-layout" dir="rtl" lang="ar">
      <AdminNav name={admin.name} newReports={newReports} />
      <section className="dash-main">{children}</section>
    </div>
  );
}
