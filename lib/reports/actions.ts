"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export type ReportState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  serviceId: z.string().max(80),
  kind: z.enum(["PHONE", "LOCATION", "OUTDATED", "MISSING", "OTHER"]),
  message: z.string().trim().min(5).max(1000),
});

/** بلاغ عن معلومة غير صحيحة (يرسله أي زائر). يصل للأدمن في /admin/reports. */
export async function submitReport(_prev: ReportState, form: FormData): Promise<ReportState> {
  const lang = String(form.get("lang") ?? "ar");
  const msg = (arText: string, enText: string) => (lang === "en" ? enText : arText);

  const parsed = schema.safeParse({ serviceId: form.get("serviceId"), kind: form.get("kind"), message: form.get("message") });
  if (!parsed.success) {
    if (parsed.error.issues[0]?.path[0] === "kind") return { error: msg("اختار نوع المشكلة.", "Choose the type of problem.") };
    return { error: msg("اكتب وصف المشكلة (5 أحرف على الأقل).", "Describe the problem (at least 5 characters).") };
  }

  // حد بسيط حتى لا تُملأ القاعدة ببلاغات متكررة
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!checkRateLimit(`report:${ip}`).allowed) return { error: msg("بلاغات كثيرة. جرب بعد دقيقة.", "Too many reports. Try again in a minute.") };

  const service = await prisma.service.findUnique({ where: { id: parsed.data.serviceId }, select: { id: true } });
  if (!service) return { error: msg("الخدمة غير موجودة.", "Service not found.") };

  const user = await getCurrentUser();
  await prisma.report.create({
    data: { serviceId: service.id, kind: parsed.data.kind, message: parsed.data.message, userId: user?.id ?? null },
  });
  return { ok: true };
}
