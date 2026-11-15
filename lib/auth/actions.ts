"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { hashNationalId, hashResidenceId, normalizeNationalId, normalizeResidenceId, toLatinDigits } from "@/lib/auth/nationalId";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";

export type AuthState = { error?: string; ok?: boolean } | undefined;

/** نوحّد صيغة الدخول: البريد بحروف صغيرة، والهاتف بالأرقام فقط (09XXXXXXXX). */
function normalizeLogin(raw: string): string | null {
  const value = toLatinDigits(raw).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?218/, "0");
  if (/^0?9[1-5]\d{7}$/.test(digits)) return digits.startsWith("0") ? digits : `0${digits}`;
  return null;
}

/**
 * هاتف الأجنبي: مفتاح الدولة يُضاف تلقائياً لكل رقم (أو يكتبه المستخدم بـ +).
 * أرقام ليبيا (218) تُحفظ بنفس صيغة المواطنين (09XXXXXXXX) حتى لا يتكرر الحساب.
 */
function normalizeForeignLogin(raw: string, dial: string): string | null {
  const value = toLatinDigits(raw).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
  const compact = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{4,15}$/.test(compact) || !/^\d{1,3}$/.test(dial)) return null;
  const full = compact.startsWith("+") ? compact.slice(1) : `${dial}${compact.replace(/^0+/, "")}`;
  if (full.length < 8 || full.length > 15) return null;
  return full.startsWith("218") ? normalizeLogin(`+${full}`) : `+${full}`;
}

const ar = (lang: string, arText: string, enText: string) => (lang === "en" ? enText : arText);

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  login: z.string().max(120),
  password: z.string().min(8).max(200),
  role: z.enum(["CITIZEN", "FOREIGNER"]),
  nationalId: z.string().max(40).optional(),
  residenceId: z.string().max(40).optional(),
  noResidence: z.string().optional(),
  email: z.string().max(120).optional(),
  confirmPassword: z.string().max(200).optional(),
  phoneCode: z.string().max(4).optional(),
  lang: z.string().optional(),
});

export async function signup(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  const lang = String(form.get("lang") ?? "ar");
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "name") return { error: ar(lang, "اكتب اسمك (حرفين على الأقل).", "Enter your name (at least 2 characters).") };
    if (field === "password") return { error: ar(lang, "كلمة المرور لازم تكون 8 أحرف على الأقل.", "Password must be at least 8 characters.") };
    if (field === "role") return { error: ar(lang, "اختار نوع الحساب.", "Choose an account type.") };
    return { error: ar(lang, "تأكد من البيانات المدخلة.", "Check the details you entered.") };
  }
  if (parsed.data.confirmPassword !== undefined && parsed.data.confirmPassword !== parsed.data.password)
    return { error: ar(lang, "كلمتا المرور غير متطابقتين.", "The two passwords do not match.") };
  const citizen = parsed.data.role === "CITIZEN";
  const login = citizen ? normalizeLogin(parsed.data.login) : normalizeForeignLogin(parsed.data.login, parsed.data.phoneCode ?? "218");
  // المواطن: رقم هاتف ليبي + رقم وطني. الأجنبي: هاتف أو بريد.
  if (!login || login.includes("@"))
    return citizen
      ? { error: ar(lang, "اكتب رقم هاتف ليبي صحيح (09X XXX XXXX).", "Enter a valid Libyan phone (09X XXX XXXX).") }
      : { error: ar(lang, "اكتب رقم هاتف صحيح مع اختيار مفتاح دولتك.", "Enter a valid phone number with your country code.") };

  // البريد الاختياري (حقل مستقل للمواطن)
  let email: string | null = null;
  const rawEmail = (parsed.data.email ?? "").trim().toLowerCase();
  if (rawEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail))
      return { error: ar(lang, "اكتب بريداً إلكترونياً صحيحاً أو اتركه فارغاً.", "Enter a valid email or leave it empty.") };
    email = rawEmail;
  }

  let nationalIdHash: string | null = null;
  if (citizen) {
    const nationalId = normalizeNationalId(parsed.data.nationalId ?? "");
    if (!nationalId)
      return { error: ar(lang, "الرقم الوطني لازم يكون 12 رقماً ويبدأ بـ 1 أو 2.", "The national ID must be 12 digits starting with 1 or 2.") };
    nationalIdHash = hashNationalId(nationalId);
  }

  // الأجنبي: رقم الإقامة مطلوب، إلا إن اختار «ما عندي إقامة بعد» (القادم الجديد يبحث عن الإقامة أصلاً)
  let residenceIdHash: string | null = null;
  if (!citizen && parsed.data.noResidence !== "1") {
    const residenceId = normalizeResidenceId(parsed.data.residenceId ?? "");
    if (!residenceId)
      return {
        error: ar(
          lang,
          "اكتب رقم الإقامة (حروف وأرقام، من 5 إلى 20)، أو اختر «ما عندي إقامة بعد».",
          "Enter your residence number (5–20 letters/digits), or choose “I don't have a residence permit yet”.",
        ),
      };
    residenceIdHash = hashResidenceId(residenceId);
  }

  const exists = await prisma.user.findFirst({
    where: {
      OR: [{ login }, ...(email ? [{ email }, { login: email }] : []), ...(nationalIdHash ? [{ nationalIdHash }] : []), ...(residenceIdHash ? [{ residenceIdHash }] : [])],
    },
    select: { id: true },
  });
  if (exists) return { error: ar(lang, "يوجد حساب مسجّل بهذا الرقم. سجّل دخولك بدل إنشاء حساب جديد.", "An account with these details already exists. Sign in instead.") };

  // الأدمن لا يُنشأ من الموقع أبداً: role هنا مواطن أو أجنبي فقط (يفرضه zod)
  const user = await prisma.user.create({
    data: { login, email, nationalIdHash, residenceIdHash, name: parsed.data.name, role: parsed.data.role, passwordHash: await hashPassword(parsed.data.password) },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const lang = String(form.get("lang") ?? "ar");
  // ثلاث خانات منفصلة (هاتف، بريد، رقم وطني أو إقامة): يكفي تعبئة واحدة منها.
  // "login" حقل قديم (خانة واحدة مدمجة) نبقيه ليعمل أي نموذج قديم.
  const phoneCode = String(form.get("phoneCode") ?? "");
  const phoneRaw = String(form.get("phone") ?? "").trim();
  const emailRaw = String(form.get("email") ?? "").trim();
  const idRaw = String(form.get("idNumber") ?? "").trim();
  const legacyRaw = String(form.get("login") ?? "").trim();

  const logins = new Set<string>();
  const hashes: { nationalIdHash?: string; residenceIdHash?: string }[] = [];
  const addLogin = (v: string | null) => v && logins.add(v);
  addLogin(normalizeLogin(phoneRaw));
  if (phoneCode) addLogin(normalizeForeignLogin(phoneRaw, phoneCode));
  addLogin(emailRaw ? normalizeLogin(emailRaw) : null);
  for (const raw of [idRaw, legacyRaw]) {
    if (!raw) continue;
    const nationalId = normalizeNationalId(raw);
    const residenceId = normalizeResidenceId(raw);
    if (nationalId) hashes.push({ nationalIdHash: hashNationalId(nationalId) });
    if (residenceId) hashes.push({ residenceIdHash: hashResidenceId(residenceId) });
  }
  if (legacyRaw) {
    addLogin(normalizeLogin(legacyRaw));
    if (phoneCode) addLogin(normalizeForeignLogin(legacyRaw, phoneCode));
  }
  const candidates = [
    ...[...logins].flatMap((v) => (v.includes("@") ? [{ login: v }, { email: v }] : [{ login: v }])),
    ...hashes,
  ];
  const loginValue = [...logins][0] || idRaw || legacyRaw;
  const password = String(form.get("password") ?? "");
  const wrong = { error: ar(lang, "بيانات الدخول غير صحيحة.", "Incorrect sign-in details.") };
  if (!loginValue || !password) return wrong;
  // حماية بسيطة من تخمين كلمات المرور: 15 محاولة في الدقيقة لكل حساب
  if (!checkRateLimit(`login:${loginValue}`).allowed)
    return { error: ar(lang, "محاولات كثيرة. استنى دقيقة وجرب مرة ثانية.", "Too many attempts. Wait a minute and try again.") };

  const matches = candidates.length ? await prisma.user.findMany({ where: { OR: candidates }, take: 6 }) : [];
  let user: (typeof matches)[number] | undefined;
  for (const m of matches) if (await verifyPassword(password, m.passwordHash)) user = m;
  // نفس الرسالة لكل الحالات حتى لا نكشف وجود الحساب من عدمه
  if (!user) return wrong;
  if (!user.active) return { error: ar(lang, "هذا الحساب موقوف. تواصل مع إدارة وينها.", "This account is suspended. Contact the WAYNHA team.") };

  await createSession(user.id);
  const next = String(form.get("next") ?? "");
  // نسمح فقط بمسارات داخل الموقع
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? (user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({ name: z.string().trim().min(2).max(80), cityId: z.string().max(20).optional() });

export async function updateProfile(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  const lang = String(form.get("lang") ?? "ar");
  if (!user) return { error: ar(lang, "سجّل دخولك أولاً.", "Sign in first.") };
  const parsed = profileSchema.safeParse({ name: form.get("name"), cityId: form.get("cityId") || undefined });
  if (!parsed.success) return { error: ar(lang, "اكتب اسمك (حرفين على الأقل).", "Enter your name (at least 2 characters).") };
  const cityId = parsed.data.cityId && (await prisma.city.findUnique({ where: { id: parsed.data.cityId } })) ? parsed.data.cityId : null;
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, cityId } });
  return { ok: true };
}
