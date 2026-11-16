import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * تخزين ملفات مستندات الزبائن. الملفات خارج مجلد public فلا تُخدَم مباشرة أبداً:
 * الوصول فقط عبر /api/procedure-files/[id] بعد التحقق أنك صاحب الملف أو أدمن.
 * الاسم على القرص عشوائي بلا امتداد، والنوع يُتحقق منه من محتوى الملف لا من اسمه.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".private-uploads");
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
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
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, storedName), buf, { flag: "wx" });
  return storedName;
}

export async function readStored(storedName: string): Promise<Buffer> {
  return readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
}

export async function deleteStored(storedNames: string[]) {
  await Promise.all(storedNames.map((name) => unlink(path.join(UPLOAD_DIR, path.basename(name))).catch(() => undefined)));
}
