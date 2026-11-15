/**
 * إنشاء حساب أدمن (أو ترقية حساب موجود) من الخادم فقط — لا يمكن تسجيل أدمن من الموقع.
 *
 *   npm run admin:create -- --login admin@waynha.ly --name "اسم المدير"
 *
 * كلمة المرور: إن لم تُمرَّر بـ --password يُولَّد رمز قوي ويُطبع مرة واحدة؛ احفظه وغيّره لاحقاً.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../lib/generated/prisma/client.js";

loadEnv({ path: ".env.local", override: true, quiet: true });

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const rawLogin = arg("login")?.trim().toLowerCase();
const name = arg("name")?.trim() || "مدير وينها";
let password = arg("password");

if (!rawLogin) {
  console.error('الاستخدام: npm run admin:create -- --login admin@waynha.ly --name "الاسم" [--password ...]');
  process.exit(1);
}
const login = /@/.test(rawLogin) ? rawLogin : rawLogin.replace(/[\s-]/g, "");
if (password && password.length < 8) {
  console.error("كلمة المرور لازم تكون 8 أحرف على الأقل.");
  process.exit(1);
}
const generated = !password;
password ??= randomBytes(12).toString("base64url");

// نفس طريقة lib/auth/password.ts (scrypt، salt:hash)
const scryptAsync = promisify(scrypt) as (p: string, s: Buffer, k: number) => Promise<Buffer>;
const salt = randomBytes(16);
const passwordHash = `${salt.toString("hex")}:${(await scryptAsync(password, salt, 64)).toString("hex")}`;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const user = await prisma.user.upsert({
  where: { login },
  update: { role: "ADMIN", active: true, passwordHash, name },
  create: { login, name, role: "ADMIN", passwordHash },
});
await prisma.session.deleteMany({ where: { userId: user.id } });
await prisma.$disconnect();

console.log(`✓ حساب الأدمن جاهز: ${login}`);
if (generated) console.log(`كلمة المرور (تظهر مرة واحدة فقط، احفظها): ${password}`);
