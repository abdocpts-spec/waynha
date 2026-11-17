import DashboardView from "@/components/account/DashboardView";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";
import { visibleServiceWhere } from "@/lib/search/serviceSearch";
import { toReliabilityPayload } from "@/lib/reliability";
import { uiLang } from "@/lib/i18n";

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
      nextReviewAt: true,
      reviewIntervalDays: true,
      reviewedById: true,
      contentEditedAt: true,
      status: true,
      sources: { select: { name: true, nameEn: true, type: true, url: true, accessedAt: true, linkStatus: true } },
      reports: { where: { status: { in: ["NEW", "IN_REVIEW"] } }, select: { status: true } },
      category: { select: { titleAr: true, titleEn: true, reviewIntervalDays: true } },
    },
  });

  const services = records.map((s) => ({
    id: s.id,
    icon: s.icon,
    title: lang === "ar" ? s.titleAr : s.titleEn,
    category: lang === "ar" ? s.category.titleAr : s.category.titleEn,
    reliability: toReliabilityPayload(s, uiLang(lang)),
  }));

  // بدل «الإشعارات» الثابتة في النموذج الأولي: آخر الإجراءات التي راجعها فريق وينها فعلاً
  const updates = records
    .filter((s) => s.lastReviewedAt && s.reviewedById)
    .sort((a, b) => b.lastReviewedAt!.getTime() - a.lastReviewedAt!.getTime())
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      title: lang === "ar" ? s.titleAr : s.titleEn,
      date: formatDate(s.lastReviewedAt!.toISOString(), lang),
    }));

  const progress = user
    ? await prisma.procedureProgress.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: { service: { select: { icon: true, titleAr: true, titleEn: true } } },
      })
    : [];
  const procedures = progress.map((p) => ({
    id: p.serviceId,
    icon: p.service.icon,
    title: lang === "ar" ? p.service.titleAr : p.service.titleEn,
    stage: p.stage,
    review: p.reviewStatus,
    reminder: p.reminderAt ? p.reminderAt.toISOString().slice(0, 10) : "",
  }));

  return (
    <DashboardView
      lang={lang}
      services={services}
      updates={updates}
      procedures={procedures}
      user={user ? { name: user.name, role: user.role } : null}
    />
  );
}
