import DashboardView from "@/components/account/DashboardView";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";
import { visibleServiceWhere } from "@/lib/search/serviceSearch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة التحكم | وينها",
};

export default async function DashboardPage() {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const records = await prisma.service.findMany({
    where: visibleServiceWhere(user?.role),
    select: {
      id: true,
      icon: true,
      titleAr: true,
      titleEn: true,
      lastReviewedAt: true,
      category: { select: { titleAr: true, titleEn: true } },
    },
  });

  const services = records.map((s) => ({
    id: s.id,
    icon: s.icon,
    title: lang === "ar" ? s.titleAr : s.titleEn,
    category: lang === "ar" ? s.category.titleAr : s.category.titleEn,
  }));

  // بدل «الإشعارات» الثابتة في النموذج الأولي: آخر الإجراءات التي راجعها فريق وينها فعلاً
  const updates = records
    .filter((s) => s.lastReviewedAt)
    .sort((a, b) => b.lastReviewedAt!.getTime() - a.lastReviewedAt!.getTime())
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      title: lang === "ar" ? s.titleAr : s.titleEn,
      date: formatDate(s.lastReviewedAt!.toISOString(), lang),
    }));

  return <DashboardView lang={lang} services={services} updates={updates} user={user ? { name: user.name, role: user.role } : null} />;
}
