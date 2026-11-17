import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/** سجل مراجعات وتعديلات الخدمة (للأدمن فقط). يحفظ اسم المنفذ لحظة الإجراء حتى لو حُذف حسابه لاحقاً. */
export type AuditAction =
  | "CREATED"
  | "EDITED"
  | "REVIEWED"
  | "STATUS"
  | "SCHEDULE"
  | "SOURCE_ADDED"
  | "SOURCE_EDITED"
  | "SOURCE_REMOVED"
  | "REPORT";

export async function logAudit(params: {
  admin: { id: number; name: string };
  serviceId: string;
  action: AuditAction;
  changes?: Prisma.InputJsonValue;
  sourceName?: string | null;
  note?: string | null;
}) {
  await prisma.serviceAudit.create({
    data: {
      serviceId: params.serviceId,
      userId: params.admin.id,
      userName: params.admin.name,
      action: params.action,
      changes: params.changes ?? {},
      sourceName: params.sourceName ?? null,
      note: params.note ?? null,
    },
  });
}
