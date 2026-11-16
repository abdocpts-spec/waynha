import { checkRateLimit } from "@/lib/ai/rateLimit";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MAX_FILES, MAX_FILE_SIZE, detectMime, storeFile } from "@/lib/progress/files";

export const dynamic = "force-dynamic";

/** رفع ملف مستند لمتابعة إجراء. للمالك فقط، ومقفل أثناء المراجعة وبعد القبول. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "auth" }, { status: 401 });
  if (!checkRateLimit(`upload:${user.id}`, 20).allowed) return Response.json({ error: "rate" }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const serviceId = String(form?.get("serviceId") ?? "");
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "bad" }, { status: 400 });

  const progress = await prisma.procedureProgress.findUnique({
    where: { userId_serviceId: { userId: user.id, serviceId } },
    include: { _count: { select: { files: true } } },
  });
  if (!progress) return Response.json({ error: "none" }, { status: 404 });
  if (progress.reviewStatus === "PENDING" || progress.reviewStatus === "APPROVED" || progress.stage > 2)
    return Response.json({ error: "locked" }, { status: 409 });
  if (progress._count.files >= MAX_FILES) return Response.json({ error: "limit" }, { status: 409 });
  if (file.size === 0 || file.size > MAX_FILE_SIZE) return Response.json({ error: "size" }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = detectMime(buf);
  if (!mime) return Response.json({ error: "type" }, { status: 415 });

  const storedName = await storeFile(buf);
  const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").trim().slice(0, 80) || "document";
  const row = await prisma.procedureFile.create({
    data: { progressId: progress.id, name, storedName, mime, size: buf.length },
    select: { id: true },
  });
  return Response.json({ id: row.id });
}
