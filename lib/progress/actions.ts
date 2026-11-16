"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteStored } from "@/lib/progress/files";
import { isStage } from "@/lib/progress/stages";

/** متابعة الإجراءات حسابٌ شخصي: كل الدوال تتطلب مستخدماً مسجّلاً وتعمل على سجلّاته فقط. */

function refresh(serviceId: string) {
  revalidatePath(`/services/${serviceId}`);
  revalidatePath("/dashboard");
}

function datesOf(value: unknown): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, string>) } : {};
}

export async function startProcedure(serviceId: string) {
  const user = await getCurrentUser();
  if (!user || typeof serviceId !== "string") return;
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
  if (!service) return;
  await prisma.procedureProgress.upsert({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    create: { userId: user.id, serviceId, stage: 1, stageDates: { "1": new Date().toISOString() } },
    update: {},
  });
  refresh(serviceId);
}

export async function setProcedureStage(serviceId: string, stage: number) {
  const user = await getCurrentUser();
  if (!user || !isStage(stage)) return;
  const row = await prisma.procedureProgress.findUnique({ where: { userId_serviceId: { userId: user.id, serviceId } } });
  if (!row) return;
  // لا تتجاوز مرحلة المستندات قبل مراجعة فريق وينها لها
  if (stage >= 3 && row.reviewStatus !== "APPROVED") return;
  const dates = datesOf(row.stageDates);
  // الرجوع لمرحلة سابقة يمسح تواريخ المراحل اللاحقة، والتقدّم يسجّل تاريخ المرحلة الجديدة
  for (const key of Object.keys(dates)) if (Number(key) > stage) delete dates[key];
  if (!dates[String(stage)]) dates[String(stage)] = new Date().toISOString();
  await prisma.procedureProgress.update({ where: { id: row.id }, data: { stage, stageDates: dates } });
  refresh(serviceId);
}

export async function saveProcedureDetails(serviceId: string, reminder: string, note: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(reminder) ? new Date(`${reminder}T12:00:00.000Z`) : null;
  await prisma.procedureProgress.updateMany({
    where: { userId: user.id, serviceId },
    data: { reminderAt: date && !Number.isNaN(date.getTime()) ? date : null, note: note.trim().slice(0, 500) || null },
  });
  refresh(serviceId);
}

export async function stopProcedure(serviceId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  // نحذف ملفات المستندات من القرص أولاً ثم السجل
  const files = await prisma.procedureFile.findMany({
    where: { progress: { userId: user.id, serviceId } },
    select: { storedName: true },
  });
  await deleteStored(files.map((f) => f.storedName));
  await prisma.procedureProgress.deleteMany({ where: { userId: user.id, serviceId } });
  refresh(serviceId);
}

export async function deleteProcedureFile(fileId: number) {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(fileId)) return;
  const file = await prisma.procedureFile.findUnique({
    where: { id: fileId },
    include: { progress: { select: { userId: true, serviceId: true, reviewStatus: true } } },
  });
  if (!file || file.progress.userId !== user.id) return;
  // مقفل أثناء المراجعة وبعد القبول
  if (file.progress.reviewStatus === "PENDING" || file.progress.reviewStatus === "APPROVED") return;
  await deleteStored([file.storedName]);
  await prisma.procedureFile.delete({ where: { id: file.id } });
  refresh(file.progress.serviceId);
}

/** يرسل مستندات مرحلة «أجمع المستندات» لفريق وينها ليراجعها. */
export async function submitForReview(serviceId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const row = await prisma.procedureProgress.findUnique({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    include: { _count: { select: { files: true } } },
  });
  if (!row || row.stage !== 2 || row._count.files < 1) return;
  if (row.reviewStatus !== "NONE" && row.reviewStatus !== "NEEDS_CHANGES") return;
  await prisma.procedureProgress.update({
    where: { id: row.id },
    data: { reviewStatus: "PENDING", submittedAt: new Date(), reviewNote: null },
  });
  revalidatePath("/admin/reviews");
  refresh(serviceId);
}
