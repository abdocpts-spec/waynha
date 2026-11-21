import { createHash } from "node:crypto";
import { z } from "zod";
import { getGeminiClient, isAiConfigured } from "@/lib/ai/gemini";
import { checkRateLimit, clientKey } from "@/lib/ai/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ثوانٍ: توليد الصوت/الرد قد يطول

/**
 * قراءة صوتية بالعربية عندما لا يملك جهاز المستخدم صوتاً عربياً (Gemini TTS).
 * يُرسل نص الإجراء أو رد المساعد فقط (لا بيانات شخصية)، ويرجع ملف WAV.
 */
const MAX_CHARS = 2500;
const MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];
const SAMPLE_RATE = 24000;

const bodySchema = z.object({
  text: z.string().trim().min(1).max(MAX_CHARS),
  lang: z.enum(["ar", "en"]),
});

// ذاكرة مؤقتة لآخر النتائج: نفس الإجراء لا يُولَّد صوته مرتين
const cache = new Map<string, Buffer>();
const CACHE_MAX = 40;

function wavFromPcm(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function audioResponse(wav: Buffer) {
  return new Response(new Uint8Array(wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" },
  });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!isAiConfigured()) return Response.json({ error: "unavailable" }, { status: 503 });
  if (!checkRateLimit(`tts:${clientKey(request)}`, 20).allowed)
    return Response.json({ error: "rate_limited" }, { status: 429 });

  const { text, lang } = parsed.data;
  const key = createHash("sha256").update(`${lang}\n${text}`).digest("hex");
  const hit = cache.get(key);
  if (hit) return audioResponse(hit);

  const instruction =
    lang === "ar"
      ? "اقرأ النص التالي بصوت واضح وهادئ وبسرعة مناسبة باللغة العربية، دون إضافة أي كلام. النص:\n"
      : "Read the following text aloud clearly and calmly, without adding anything. Text:\n";

  const client = getGeminiClient();
  for (const model of MODELS) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: instruction + text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
      });
      const data = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
      if (!data) continue;
      const wav = wavFromPcm(Buffer.from(data, "base64"));
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, wav);
      return audioResponse(wav);
    } catch {
      // ننتقل للنموذج التالي (ضغط مؤقت أو حصة)
    }
  }
  return Response.json({ error: "unavailable" }, { status: 503 });
}
