import "server-only";
import { REPORT_WEIGHT } from "@/lib/admin/labels";
import { prisma } from "@/lib/db";
import { computeReliability, type ReliabilityStatus, type Reason } from "@/lib/reliability";

export type ReliabilityRow = {
  id: string;
  icon: string;
  titleAr: string;
  categoryAr: string;
  published: boolean;
  status: ReliabilityStatus;
  reasons: Reason[];
  dueSoon: boolean;
  lastReviewedAt: Date | null;
  reviewerName: string | null;
  dueAt: Date | null;
  sourceCount: number;
  openReports: number;
  priority: number;
  priorityLabel: "high" | "medium" | "low" | null;
  needsAttention: boolean;
};

const BASE = { OUTDATED: 40, NO_SOURCE: 30, NEEDS_REVIEW: 20, REVIEWED: 0 } as const;

/** كل الخدمات مع حالة موثوقيتها المحسوبة وأولوية مراجعتها (للأدمن فقط). */
export async function loadReliabilityRows(): Promise<ReliabilityRow[]> {
  const services = await prisma.service.findMany({
    include: {
      category: { select: { titleAr: true, reviewIntervalDays: true } },
      sources: { select: { name: true, nameEn: true, type: true, url: true, accessedAt: true, linkStatus: true } },
      reports: { where: { status: { in: ["NEW", "IN_REVIEW"] } }, select: { status: true, kind: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  const now = new Date();
  const rows = services.map((s): ReliabilityRow => {
    const r = computeReliability(s, now);
    const weight = s.reports.reduce((sum, x) => sum + (REPORT_WEIGHT[x.kind] ?? 1) * (x.status === "IN_REVIEW" ? 2 : 1), 0);
    const overdueDays = r.status === "OUTDATED" && r.dueAt ? Math.min(60, Math.floor((now.getTime() - r.dueAt.getTime()) / 86_400_000)) : 0;
    const priority = BASE[r.status] + weight * 3 + overdueDays / 3 + (r.dueSoon ? 10 : 0);
    return {
      id: s.id,
      icon: s.icon,
      titleAr: s.titleAr,
      categoryAr: s.category.titleAr,
      published: s.status === "PUBLISHED" || s.status === "NEEDS_UPDATE",
      status: r.status,
      reasons: r.reasons,
      dueSoon: r.dueSoon,
      lastReviewedAt: r.reviewed ? s.lastReviewedAt : null,
      reviewerName: s.reviewedBy?.name ?? null,
      dueAt: r.dueAt,
      sourceCount: s.sources.length,
      openReports: s.reports.length,
      priority,
      priorityLabel: null,
      needsAttention: r.status !== "REVIEWED" || r.dueSoon,
    };
  });
  rows.sort((a, b) => b.priority - a.priority);
  for (const row of rows) {
    if (!row.needsAttention) continue;
    row.priorityLabel = row.priority >= 50 ? "high" : row.priority >= 25 ? "medium" : "low";
  }
  return rows;
}

/** عدد الخدمات التي تحتاج انتباه الإدارة (تظهر في اللوحة وشريط التنقل). */
export async function countNeedsReview(): Promise<number> {
  return (await loadReliabilityRows()).filter((r) => r.needsAttention && r.published).length;
}
