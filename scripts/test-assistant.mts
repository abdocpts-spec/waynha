/**
 * اختبار مساعد وينها من طرف إلى طرف مع Gemini الحقيقي
 * (يحتاج GEMINI_API_KEY في .env.local والخادم شغال: npm run dev).
 *
 *   npm run test:assistant
 *
 * يغطي: أسئلة عامة عن المساعد (بدون قاعدة البيانات)، اللهجة الليبية،
 * البحث في PostgreSQL، تذكّر المحادثة، وخدمة غير موجودة (يجب ألا يخترع معلومات).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: process.env.ENV_FILE ?? ".env.local", override: true, quiet: true });

const BASE = process.env.WAYNHA_BASE_URL ?? "http://localhost:3000";
/** مهلة بين الأسئلة حتى لا نتجاوز حد الطلبات في الدقيقة للخطة المجانية */
const PAUSE_MS = Number(process.env.TEST_PAUSE_MS ?? 5000);

type Turn = { role: "user" | "assistant"; content: string };

type Result = {
  message: string;
  model: string;
  provider: string;
  matchedService: { id: string; title: string } | null;
  offices: { name: string }[];
  quickReplies: { label: string }[];
  requiresClarification: boolean;
};

const NOT_AVAILABLE = /(مش|غير) متوفر/;

async function ask(message: string, conversation: Turn[] = []): Promise<Result> {
  const response = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, conversation, language: "ar", stream: false }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; devMessage?: string } }
      | null;
    throw new Error(
      `${response.status} ${payload?.error?.devMessage ?? payload?.error?.message ?? ""}`,
    );
  }

  const data = (await response.json()) as Omit<Result, "provider">;
  return { ...data, provider: response.headers.get("x-waynha-ai-provider") ?? "?" };
}

const results: { title: string; ok: boolean; why: string }[] = [];

function check(title: string, question: string, result: Result, ok: boolean, why: string) {
  console.log(`\n══ ${title}`);
  console.log(`👤 ${question}`);
  console.log(`🤖 ${result.message.replace(/\n/g, "\n   ")}`);
  console.log(
    `   [${result.provider} / ${result.model} | الخدمة: ${result.matchedService?.id ?? "—"} | جهات: ${result.offices.length} | توضيح: ${result.requiresClarification ? "نعم" : "لا"}]`,
  );
  console.log(`   ${ok ? "✅" : "❌"} ${why}`);
  results.push({ title, ok, why });
}

const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

async function main() {
  // 1) سؤال عن المساعد نفسه — لا يحتاج قاعدة البيانات
  const q1 = "من انت";
  const r1 = await ask(q1);
  check(
    "TEST 1: من انت",
    q1,
    r1,
    r1.provider === "google-gemini" && !r1.matchedService && !NOT_AVAILABLE.test(r1.message),
    "Gemini يعرّف بنفسه، بدون خدمة وبدون \"المعلومة مش متوفرة\"",
  );
  await pause();

  // 2) قدرات المساعد
  const q2 = "شن تقدر تدير؟";
  const r2 = await ask(q2);
  check(
    "TEST 2: شن تقدر تدير؟",
    q2,
    r2,
    !r2.matchedService && !NOT_AVAILABLE.test(r2.message),
    "يشرح قدراته بدون خدمة من قاعدة البيانات",
  );
  await pause();

  // 3) لهجة ليبية → خدمة جواز مفقود من PostgreSQL
  const q3 = "يا خوي جوازي ضاع مني";
  const r3 = await ask(q3);
  check(
    "TEST 3: جواز مفقود",
    q3,
    r3,
    r3.matchedService?.id === "lost-passport",
    "يفهم اللهجة ويلقى lost-passport في PostgreSQL",
  );
  await pause();

  // 4) تذكّر الإجابة السابقة
  const q4 = "اشرحلي أبسط";
  const r4 = await ask(q4, [
    { role: "user", content: q3 },
    { role: "assistant", content: r3.message },
  ]);
  check(
    "TEST 4: اشرحلي أبسط",
    q4,
    r4,
    r4.matchedService?.id === "lost-passport" && !NOT_AVAILABLE.test(r4.message),
    "يتذكر أن الكلام على الجواز المفقود ويبسّط",
  );
  await pause();

  // 5) خدمة غير موجودة — ممنوع اختراع معلومات
  const q5 = "كيف نطلع رخصة صيد بحري؟";
  const r5 = await ask(q5);
  check(
    "TEST 5: خدمة غير موجودة",
    q5,
    r5,
    !r5.matchedService && NOT_AVAILABLE.test(r5.message),
    "يقول إن المعلومة غير متوفرة في وينها بدون اختراع",
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} نجحت`);
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("\nفشل الاختبار:", error instanceof Error ? error.message : error);
  console.error("تأكد أن الخادم شغال (npm run dev) وأن GEMINI_API_KEY موجود في .env.local");
  process.exit(1);
});
