"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/admin/audit";
import { checkLink } from "@/lib/admin/linkcheck";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { clearServiceCaches } from "@/lib/search/serviceSearch";

/**
 * إدارة موثوقية المعلومات. كل إجراء يتحقق من صلاحية الأدمن على الخادم،
 * وكل تغيير يُسجَّل في service_audits. تعديل المصدر لا يمنح «تمت المراجعة»؛
 * هذه الحالة تُمنح فقط بتسجيل مراجعة فعلية عبر recordReview.
 */

export type ReliabilityFormState = { error?: string; ok?: string } | undefined;

const SOURCE_TYPES = ["OFFICIAL_WEBSITE", "OFFICIAL_DOCUMENT", "OFFICE_VISIT", "PHONE_CALL", "ANNOUNCEMENT", "OTHER"] as const;

function refresh(serviceId: string) {
  clearServiceCaches();
  revalidatePath("/", "layout");
  revalidatePath(`/admin/reliability/${serviceId}`);
}

const dateOrNull = (value: FormDataEntryValue | null) => {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00.000Z`) : null;
  return d && !Number.isNaN(d.getTime()) ? d : undefined; // undefined = تاريخ غير صالح
};

const sourceSchema = z.object({
  serviceId: z.string().min(1).max(80),
  name: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).default(""),
  type: z.enum(SOURCE_TYPES),
  url: z.string().trim().max(500).default(""),
  note: z.string().trim().max(500).default(""),
});

async function parseSource(form: FormData) {
  const flat = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = sourceSchema.safeParse(flat);
  if (!parsed.success) return { error: "اكتب اسم المصدر (حرفان على الأقل) واختر نوعه." } as const;
  const accessedAt = dateOrNull(form.get("accessedAt"));
  if (accessedAt === undefined) return { error: "تاريخ الاطلاع غير صالح." } as const;
  if (accessedAt && accessedAt.getTime() > Date.now() + 86_400_000) return { error: "تاريخ الاطلاع لا يكون في المستقبل." } as const;
  const d = parsed.data;
  if (d.url) {
    try {
      const u = new URL(d.url);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      return { error: "الرابط غير صالح (يجب أن يبدأ بـ https:// أو http://)." } as const;
    }
  }
  return { data: { ...d, accessedAt } } as const;
}

export async function addSource(_prev: ReliabilityFormState, form: FormData): Promise<ReliabilityFormState> {
  const admin = await requireAdmin();
  const p = await parseSource(form);
  if ("error" in p) return { error: p.error };
  const { serviceId, name, nameEn, type, url, note, accessedAt } = p.data;
  if (!(await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } }))) return { error: "الخدمة غير موجودة." };

  const linkStatus = url ? await checkLink(url) : "UNCHECKED";
  const src = await prisma.serviceSource.create({
    data: {
      serviceId, name, nameEn: nameEn || null, type, url: url || null, note: note || null, accessedAt,
      linkStatus, linkCheckedAt: url ? new Date() : null,
    },
  });
  await logAudit({ admin, serviceId, action: "SOURCE_ADDED", sourceName: src.name, changes: { type, url: url || null, linkStatus } });
  refresh(serviceId);
  return {
    ok:
      linkStatus === "BROKEN"
        ? "أُضيف المصدر، لكن الرابط لا يستجيب — لن يُعرض للزوار حتى يعمل."
        : "أُضيف المصدر. لاحظ: إضافته لا تمنح الخدمة حالة «تمت المراجعة»؛ سجّل مراجعة فعلية.",
  };
}

export async function updateSource(_prev: ReliabilityFormState, form: FormData): Promise<ReliabilityFormState> {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return { error: "مصدر غير صحيح." };
  const p = await parseSource(form);
  if ("error" in p) return { error: p.error };
  const { serviceId, name, nameEn, type, url, note, accessedAt } = p.data;
  const before = await prisma.serviceSource.findUnique({ where: { id } });
  if (!before || before.serviceId !== serviceId) return { error: "المصدر غير موجود." };

  const urlChanged = (before.url ?? "") !== url;
  const linkStatus = !url ? "UNCHECKED" : urlChanged ? await checkLink(url) : before.linkStatus;
  const changed = (
    [
      ["الاسم", before.name !== name],
      ["الاسم بالإنجليزية", (before.nameEn ?? "") !== nameEn],
      ["النوع", before.type !== type],
      ["الرابط", urlChanged],
      ["تاريخ الاطلاع", (before.accessedAt?.toISOString().slice(0, 10) ?? "") !== (accessedAt?.toISOString().slice(0, 10) ?? "")],
      ["الملاحظات", (before.note ?? "") !== note],
    ] as const
  )
    .filter(([, c]) => c)
    .map(([n]) => n);

  await prisma.serviceSource.update({
    where: { id },
    data: {
      name, nameEn: nameEn || null, type, url: url || null, note: note || null, accessedAt,
      linkStatus, linkCheckedAt: urlChanged ? (url ? new Date() : null) : before.linkCheckedAt,
    },
  });
  if (changed.length) await logAudit({ admin, serviceId, action: "SOURCE_EDITED", sourceName: name, changes: { fields: changed } });
  refresh(serviceId);
  return { ok: changed.length ? "تم حفظ المصدر. (لا يغيّر حالة المراجعة.)" : "لا تغييرات." };
}

export async function deleteSource(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  const src = await prisma.serviceSource.findUnique({ where: { id } });
  if (!src) return;
  await prisma.serviceSource.delete({ where: { id } });
  await logAudit({ admin, serviceId: src.serviceId, action: "SOURCE_REMOVED", sourceName: src.name });
  refresh(src.serviceId);
}

export async function recheckSource(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  const src = await prisma.serviceSource.findUnique({ where: { id } });
  if (!src?.url) return;
  const linkStatus = await checkLink(src.url);
  await prisma.serviceSource.update({ where: { id }, data: { linkStatus, linkCheckedAt: new Date() } });
  await logAudit({ admin, serviceId: src.serviceId, action: "SOURCE_EDITED", sourceName: src.name, changes: { fields: ["فحص الرابط"], linkStatus } });
  refresh(src.serviceId);
}

const reviewSchema = z.object({
  serviceId: z.string().min(1).max(80),
  note: z.string().trim().min(3).max(500),
  intervalDays: z.coerce.number().int().min(7).max(1095).optional().or(z.literal("").transform(() => undefined)),
});

/** تسجيل مراجعة فعلية: الطريق الوحيد لمنح حالة «تمت المراجعة». يتطلب مصدراً واحداً على الأقل وملاحظة. */
export async function recordReview(_prev: ReliabilityFormState, form: FormData): Promise<ReliabilityFormState> {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { error: field === "note" ? "اكتب ملاحظة المراجعة (3 أحرف على الأقل): ماذا راجعت وعلى أي مصدر؟" : "مدة المراجعة بين 7 و1095 يوماً." };
  }
  const { serviceId, note, intervalDays } = parsed.data;
  const next = dateOrNull(form.get("nextReviewAt"));
  if (next === undefined) return { error: "تاريخ المراجعة القادمة غير صالح." };
  if (next && next.getTime() <= Date.now()) return { error: "موعد المراجعة القادمة لازم يكون في المستقبل." };

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { sources: { select: { id: true, name: true } }, category: { select: { reviewIntervalDays: true } } },
  });
  if (!service) return { error: "الخدمة غير موجودة." };
  if (service.sources.length === 0) return { error: "لا يمكن تسجيل مراجعة بدون مصدر واحد على الأقل. أضف المصدر أولاً." };

  const now = new Date();
  const interval = intervalDays ?? service.reviewIntervalDays ?? service.category.reviewIntervalDays;
  const nextReviewAt = next ?? new Date(now.getTime() + interval * 86_400_000);

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      lastReviewedAt: now,
      reviewedById: admin.id,
      nextReviewAt,
      ...(intervalDays ? { reviewIntervalDays: intervalDays } : {}),
      verified: true,
      // المراجعة الفعلية تنهي حالة «تحتاج تحديث» دون تغيير نشر الخدمة بغير ذلك
      ...(service.status === "NEEDS_UPDATE" ? { status: "PUBLISHED" as const } : {}),
    },
  });
  await logAudit({
    admin,
    serviceId,
    action: "REVIEWED",
    note,
    sourceName: service.sources.map((s) => s.name).join("، "),
    changes: { nextReviewAt: nextReviewAt.toISOString().slice(0, 10), previousStatus: service.status },
  });
  refresh(serviceId);
  return { ok: "سُجّلت المراجعة. ستظهر الخدمة «تمت المراجعة» حتى موعد المراجعة القادمة." };
}

/** تغيير موعد المراجعة أو مدتها دون تسجيل مراجعة جديدة. */
export async function setSchedule(_prev: ReliabilityFormState, form: FormData): Promise<ReliabilityFormState> {
  const admin = await requireAdmin();
  const serviceId = String(form.get("serviceId") ?? "");
  const next = dateOrNull(form.get("nextReviewAt"));
  if (next === undefined) return { error: "التاريخ غير صالح." };
  const raw = String(form.get("intervalDays") ?? "").trim();
  const interval = raw ? Number(raw) : null;
  if (interval !== null && (!Number.isInteger(interval) || interval < 7 || interval > 1095)) return { error: "مدة المراجعة بين 7 و1095 يوماً." };
  const before = await prisma.service.findUnique({ where: { id: serviceId }, select: { nextReviewAt: true, reviewIntervalDays: true } });
  if (!before) return { error: "الخدمة غير موجودة." };
  await prisma.service.update({ where: { id: serviceId }, data: { nextReviewAt: next, reviewIntervalDays: interval } });
  await logAudit({
    admin,
    serviceId,
    action: "SCHEDULE",
    changes: {
      nextReviewAt: [before.nextReviewAt?.toISOString().slice(0, 10) ?? null, next?.toISOString().slice(0, 10) ?? null],
      reviewIntervalDays: [before.reviewIntervalDays, interval],
    },
  });
  refresh(serviceId);
  return { ok: "تم تحديث الجدولة." };
}

/** مدة المراجعة الافتراضية لقسم كامل من الخدمات. */
export async function setCategoryInterval(form: FormData) {
  await requireAdmin();
  const categoryId = String(form.get("categoryId") ?? "");
  const days = Number(form.get("days"));
  if (!Number.isInteger(days) || days < 7 || days > 1095) return;
  await prisma.category.update({ where: { id: categoryId }, data: { reviewIntervalDays: days } });
  clearServiceCaches();
  revalidatePath("/admin/reliability");
  revalidatePath("/", "layout");
}
