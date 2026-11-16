import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { readStored } from "@/lib/progress/files";

export const dynamic = "force-dynamic";

/** عرض ملف مستند: لصاحبه أو للأدمن فقط. لا يُخزَّن في أي كاش. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const id = Number((await params).id);
  if (!user || !Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const row = await prisma.procedureFile.findUnique({ where: { id }, include: { progress: { select: { userId: true } } } });
  // نفس الرد لغير المالك حتى لا نكشف وجود الملف
  if (!row || (user.role !== "ADMIN" && row.progress.userId !== user.id)) return new Response("Not found", { status: 404 });

  const data = await readStored(row.storedName).catch(() => null);
  if (!data) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": row.mime,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
  if (row.mime !== "application/pdf") headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'";
  return new Response(new Uint8Array(data), { headers });
}
