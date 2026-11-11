/**
 * فحص سريع لطبقة البحث (بدون استدعاء الذكاء الاصطناعي).
 *   npx tsx scripts/check-search.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true, quiet: true });

const { searchServices, confidentMatch } = await import("@/lib/search/serviceSearch");
const { buildClarification } = await import("@/lib/search/clarify");

const CASES: [string, string | null][] = [
  ["ضاع جوازي شن ندير؟", "lost-passport"],
  ["ضيعت جوازي", "lost-passport"],
  ["جواز سفري ضايع", "lost-passport"],
  ["نبي بدل فاقد", "lost-passport"],
  ["شن ندير لو الجواز ضاع", "lost-passport"],
  ["جوازي منتهي نبي نجدده", "renew-passport"],
  ["تجديد جواز السفر", "renew-passport"],
  ["نبي نطلع ورقة ميلاد", "birth-certificate"],
  ["شهادة ميلاد", "birth-certificate"],
  ["مستخرج ميلاد", "birth-certificate"],
  ["شن نحتاج لتجديد الرخصة؟", "renew-license"],
  ["رخصتي منتهية", "renew-license"],
  ["بعت سيارتي وش ندير", "transfer-ownership"],
  ["نبي نسجل سيارة جديدة", "register-vehicle"],
  ["الهوية الوطنية", "national-id"],
  ["نبي نفتح شركة", "register-company"],
  ["بطاقة صحية", "health-card"],
  ["I lost my passport", "lost-passport"],
  ["renew driving license", "renew-license"],
  ["birth certificate", "birth-certificate"],
  // أسئلة يجب ألا يخمّن فيها المساعد
  ["نبي جواز", null],
  ["شهادة وفاة", null],
  ["تأشيرة سياحية", null],
];

let passed = 0;
for (const [query, expected] of CASES) {
  const matches = await searchServices(query);
  const confident = confidentMatch(matches);
  const got = confident?.service.id ?? null;
  const ok = got === expected;
  if (ok) passed += 1;
  const clarification = confident ? null : buildClarification(query, matches, "ar");
  console.log(
    `${ok ? "✅" : "❌"} ${query.padEnd(32)} → ${String(got).padEnd(22)}` +
      (ok ? "" : ` (المتوقع: ${expected})`) +
      (clarification ? `  [توضيح: ${clarification.options.map((o) => o.label).join(" | ")}]` : ""),
  );
}
console.log(`\n${passed}/${CASES.length}`);
process.exit(passed === CASES.length ? 0 : 1);
