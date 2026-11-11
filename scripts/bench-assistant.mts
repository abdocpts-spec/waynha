/**
 * قياس سرعة مساعد وينها (أول كلمة + الزمن الكامل) عبر البث الحقيقي.
 * يحتاج الخادم شغال (npm run dev).
 *
 *   npm run bench:assistant
 */
const BASE = process.env.WAYNHA_BASE_URL ?? "http://localhost:3000";
const PAUSE_MS = Number(process.env.TEST_PAUSE_MS ?? 4000);

type Turn = { role: "user" | "assistant"; content: string };

async function ask(message: string, conversation: Turn[]) {
  const started = performance.now();
  const response = await fetch(`${BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, conversation, language: "ar" }),
  });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let firstToken: number | null = null;
  let service: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line) continue;
      const event = JSON.parse(line) as { type: string; text?: string; message?: string; matchedService?: { id: string } | null };
      if (event.type === "meta") service = event.matchedService?.id ?? null;
      if (event.type === "delta" && event.text) {
        firstToken ??= performance.now() - started;
        answer += event.text;
      }
      if (event.type === "error") throw new Error(event.message);
    }
  }
  return { answer, service, firstToken: firstToken ?? NaN, total: performance.now() - started };
}

const questions = ["من انت", "ضاع جوازي شن ندير؟", "شن الأوراق المطلوبة؟", "اشرحلي أبسط"];

async function main() {
  const conversation: Turn[] = [];
  const rows: { q: string; first: number; total: number; service: string | null }[] = [];
  for (const [index, q] of questions.entries()) {
    if (index > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
    const r = await ask(q, conversation);
    conversation.push({ role: "user", content: q }, { role: "assistant", content: r.answer });
    rows.push({ q, first: r.firstToken, total: r.total, service: r.service });
    console.log(`\n👤 ${q}\n🤖 ${r.answer.trim().replace(/\n/g, "\n   ")}`);
    console.log(`   ⏱ first-token=${Math.round(r.firstToken)}ms total=${Math.round(r.total)}ms service=${r.service ?? "—"}`);
  }
  const avg = (key: "first" | "total") => Math.round(rows.reduce((s, r) => s + r[key], 0) / rows.length);
  console.log(`\nمتوسط أول كلمة: ${avg("first")}ms · متوسط الزمن الكامل: ${avg("total")}ms`);
}

main().catch((error: unknown) => {
  console.error("فشل القياس:", error instanceof Error ? error.message : error);
  process.exit(1);
});
