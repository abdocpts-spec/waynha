import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/enums";

/**
 * جلسات قاعدة البيانات (Database Sessions حسب دليل Next.js):
 * - رمز عشوائي في كوكي httpOnly (لا يقرؤه JavaScript في المتصفح).
 * - في قاعدة البيانات نخزّن SHA-256 للرمز فقط، فتسريب الجدول لا يكشف الجلسات.
 */
const COOKIE = "waynha-session";
const MAX_AGE_DAYS = 14;

export type CurrentUser = {
  id: number;
  name: string;
  login: string;
  role: Role;
  cityId: string | null;
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { id: hashToken(token), userId, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
  store.delete(COOKIE);
}

/** المستخدم الحالي (أو null). مخزَّن لكل طلب حتى لا تتكرر قراءة قاعدة البيانات. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, name: true, login: true, role: true, cityId: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  const { active: _active, ...user } = session.user;
  void _active;
  return user;
});

/** للصفحات والإجراءات الخاصة بالأدمن: أي شخص آخر يُحوَّل لصفحة الدخول. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login?next=/admin");
  return user;
}
