import "server-only";
import { randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

/**
 * تخزين ملفات مستندات الزبائن في قاعدة البيانات (جدول stored_blobs)، فلا تُخدَم مباشرة أبداً:
 * الوصول فقط عبر /api/procedure-files/[id] بعد التحقق أنك صاحب الملف أو أدمن.
 * الاسم عشوائي بلا امتداد، والنوع يُتحقق منه من محتوى الملف لا من اسمه.
 * (الملفات القديمة التي حُفظت سابقاً على القرص تُقرأ من UPLOAD_DIR كاحتياط.)
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".private-uploads");
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // حد الطلب في Vercel هو 4.5MB
export const MAX_FILES = 10;

export type FileMime = "image/jpeg" | "image/png" | "application/pdf";

/** نتعرّف على النوع من أول بايتات الملف (JPEG, PNG, PDF فقط). */
export function detectMime(buf: Buffer): FileMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

export async function storeFile(buf: Buffer): Promise<string> {
  const storedName = randomBytes(16).toString("hex");
  await prisma.storedBlob.create({ data: { storedName, data: new Uint8Array(buf) } });
  return storedName;
}

export async function readStored(storedName: string): Promise<Buffer> {
  const row = await prisma.storedBlob.findUnique({ where: { storedName }, select: { data: true } });
  if (row) return Buffer.from(row.data);
  // ملفات قديمة محفوظة على القرص قبل الانتقال لقاعدة البيانات
  return readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
}

export async function deleteStored(storedNames: string[]) {
  await prisma.storedBlob.deleteMany({ where: { storedName: { in: storedNames } } });
  await Promise.all(storedNames.map((name) => unlink(path.join(UPLOAD_DIR, path.basename(name))).catch(() => undefined)));
}
