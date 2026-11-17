import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/session";
import { countNeedsReview } from "@/lib/admin/reliabilityData";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة | وينها",
};

/** كل صفحات /admin للأدمن فقط: يُتحقق من الجلسة على الخادم قبل عرض أي شيء. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [newReports, pendingReviews, needsReview] = await Promise.all([
    prisma.report.count({ where: { status: "NEW" } }),
    prisma.procedureProgress.count({ where: { reviewStatus: "PENDING" } }),
    countNeedsReview(),
  ]);

  return (
    <div className="dashboard-layout" dir="rtl" lang="ar">
      <AdminNav name={admin.name} newReports={newReports} pendingReviews={pendingReviews} needsReview={needsReview} />
      <section className="dash-main">{children}</section>
    </div>
  );
}
