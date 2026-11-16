"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { normalizeText } from "@/lib/search/normalize";
import { clearServiceCaches } from "@/lib/search/serviceSearch";

/**
 * إجراءات لوحة الإدارة. كل إجراء يتحقق من صلاحية الأدمن على الخادم بنفسه
 * (لا نعتمد على إخفاء الأزرار في الواجهة).
 */

const STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "NEEDS_UPDATE"] as const;
const AUDIENCES = ["ALL", "CITIZEN", "FOREIGNER"] as const;

function refreshPublic() {
  clearServiceCaches();
  revalidatePath("/", "layout");
}

// ─────────── مراحل اعتماد الخدمة ───────────

export async function setServiceStatus(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = z.enum(STATUSES).parse(form.get("status"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  await prisma.service.update({
    where: { id },
    data: {
      status,
      reviewNote: note,
      // الاعتماد = مراجعة جديدة من فريق وينها (التاريخ يظهر للمستخدمين)
      ...(status === "PUBLISHED" ? { lastReviewedAt: new Date(), verified: true } : {}),
      ...(status === "NEEDS_UPDATE" ? { verified: false } : {}),
    },
  });
  refreshPublic();
}

export async function setServiceAudience(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const audience = z.enum(AUDIENCES).parse(form.get("audience"));
  await prisma.service.update({ where: { id }, data: { audience } });
  refreshPublic();
}

// ─────────── إضافة وتعديل خدمة ───────────

export type ServiceFormState = { error?: string } | undefined;

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30);

const serviceSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,60}$/),
  categoryId: z.string().min(1),
  icon: z.string().trim().max(8).default("📄"),
  audience: z.enum(AUDIENCES),
  titleAr: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  shortDescAr: z.string().trim().max(500).default(""),
  shortDescEn: z.string().trim().max(500).default(""),
  departmentAr: z.string().trim().max(200).default(""),
  departmentEn: z.string().trim().max(200).default(""),
  feesAr: z.string().trim().max(200).default(""),
  feesEn: z.string().trim().max(200).default(""),
  durationAr: z.string().trim().max(200).default(""),
  durationEn: z.string().trim().max(200).default(""),
  hoursAr: z.string().trim().max(200).default(""),
  hoursEn: z.string().trim().max(200).default(""),
  eligibilityAr: z.string().trim().max(500).default(""),
  eligibilityEn: z.string().trim().max(500).default(""),
  sourceAr: z.string().trim().max(200).default(""),
  sourceEn: z.string().trim().max(200).default(""),
});

/** يجمع سطور العربي والإنجليزي بالترتيب (السطر الإنجليزي الناقص يأخذ العربي). */
function pairLines(arText: FormDataEntryValue | null, enText: FormDataEntryValue | null) {
  const ar = lines(arText);
  const en = lines(enText);
  return ar.map((textAr, i) => ({ position: i + 1, textAr, textEn: en[i] ?? textAr }));
}

export async function saveService(_prev: ServiceFormState, form: FormData): Promise<ServiceFormState> {
  await requireAdmin();
  const isNew = form.get("isNew") === "1";
  const parsed = serviceSchema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => typeof form.get(k) === "string")));
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    if (field === "id") return { error: "المعرّف لازم يكون بالإنجليزي الصغير وأرقام وشرطات فقط (مثال: residence-permit)." };
    if (field.startsWith("title")) return { error: "اكتب اسم الخدمة بالعربي والإنجليزي." };
    return { error: `تأكد من الحقل: ${field}` };
  }
  const data = parsed.data;
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return { error: "اختار تصنيفاً صحيحاً." };
  if (isNew && (await prisma.service.findUnique({ where: { id: data.id }, select: { id: true } })))
    return { error: "يوجد خدمة بنفس المعرّف. اختار معرّفاً آخر." };

  const steps = pairLines(form.get("stepsAr"), form.get("stepsEn"));
  const documents = pairLines(form.get("documentsAr"), form.get("documentsEn"));
  const notes = pairLines(form.get("notesAr"), form.get("notesEn"));
  const keywords = [...new Set(lines(form.get("keywords")).map((k) => normalizeText(k)).filter(Boolean))];
  const searchText = normalizeText(
    [data.titleAr, data.titleEn, data.shortDescAr, data.shortDescEn, data.departmentAr, data.departmentEn, category.titleAr, category.titleEn, ...keywords].join(" "),
  );

  const { id, ...fields } = data;
  await prisma.$transaction(async (tx) => {
    if (isNew) {
      // الخدمة الجديدة تبدأ مسودة ولا تظهر للزوار حتى يعتمدها الأدمن
      await tx.service.create({ data: { id, ...fields, searchText, status: "DRAFT", isDemo: false, verified: false } });
    } else {
      await tx.service.update({ where: { id }, data: { ...fields, searchText } });
      await tx.serviceStep.deleteMany({ where: { serviceId: id } });
      await tx.serviceDocument.deleteMany({ where: { serviceId: id } });
      await tx.serviceNote.deleteMany({ where: { serviceId: id } });
      await tx.serviceKeyword.deleteMany({ where: { serviceId: id } });
    }
    if (steps.length) await tx.serviceStep.createMany({ data: steps.map((s) => ({ ...s, serviceId: id })) });
    if (documents.length) await tx.serviceDocument.createMany({ data: documents.map((s) => ({ ...s, serviceId: id })) });
    if (notes.length) await tx.serviceNote.createMany({ data: notes.map((s) => ({ ...s, serviceId: id })) });
    if (keywords.length)
      await tx.serviceKeyword.createMany({ data: keywords.map((keyword) => ({ serviceId: id, keyword, weight: keyword.includes(" ") ? 5 : 3 })) });
  });

  refreshPublic();
  redirect(`/admin/services?saved=${encodeURIComponent(id)}`);
}

// ─────────── البلاغات ───────────

const REPORT_STATUSES = ["NEW", "IN_REVIEW", "RESOLVED", "REJECTED"] as const;

export async function setReportStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = z.enum(REPORT_STATUSES).parse(form.get("status"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const report = await prisma.report.update({
    where: { id },
    data: {
      status,
      ...(note ? { adminNote: note } : {}),
      resolvedAt: status === "RESOLVED" || status === "REJECTED" ? new Date() : null,
    },
  });
  // قبول البلاغ يعني أن المعلومة تحتاج تحديثاً: نعلّم الخدمة حتى يراها الزوار مع تنبيه
  if (status === "IN_REVIEW" && report.serviceId) {
    await prisma.service.updateMany({ where: { id: report.serviceId, status: "PUBLISHED" }, data: { status: "NEEDS_UPDATE", verified: false } });
    refreshPublic();
  }
  revalidatePath("/admin", "layout");
}

// ─────────── المستخدمون ───────────

export async function setUserRole(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  const role = z.enum(["CITIZEN", "FOREIGNER", "ADMIN"]).parse(form.get("role"));
  if (id === admin.id) return; // الأدمن لا يغيّر صلاحيته بنفسه حتى لا تبقى اللوحة بدون مدير
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserActive(form: FormData) {
  const admin = await requireAdmin();
  const id = Number(form.get("id"));
  const active = form.get("active") === "1";
  if (id === admin.id) return;
  await prisma.user.update({ where: { id }, data: { active } });
  // إيقاف الحساب يُنهي جلساته فوراً
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/users");
}

// ─────────── مراجعة مستندات الزبائن ───────────

/** قبول مستندات زبون (اكتمال فقط، وليس قبولاً رسمياً من الجهة) أو طلب تعديل مع ملاحظة. */
export async function reviewProcedure(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const decision = z.enum(["APPROVE", "CHANGES"]).parse(form.get("decision"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (!Number.isInteger(id)) return;
  if (decision === "CHANGES" && note.length < 3) return; // الملاحظة إلزامية عند طلب التعديل

  const row = await prisma.procedureProgress.findUnique({ where: { id }, select: { serviceId: true, reviewStatus: true } });
  if (!row || row.reviewStatus !== "PENDING") return;

  await prisma.procedureProgress.update({
    where: { id },
    data:
      decision === "APPROVE"
        ? { reviewStatus: "APPROVED", reviewNote: null, reviewedAt: new Date() }
        : { reviewStatus: "NEEDS_CHANGES", reviewNote: note, reviewedAt: new Date() },
  });
  revalidatePath("/admin/reviews");
  revalidatePath(`/services/${row.serviceId}`);
  revalidatePath("/dashboard");
}
