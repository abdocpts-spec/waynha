import { ApiError, GoogleGenAI, type GenerateContentParameters } from "@google/genai";

/**
 * عميل Gemini — من جهة الخادم فقط.
 * المفتاح يُقرأ من متغير البيئة GEMINI_API_KEY (في .env.local) ولا يصل للمتصفح أبداً.
 */

/**
 * النموذج الأساسي: أسرع Flash Lite متاح. الاسم المستعار "-latest" يتبع أحدث نسخة
 * في الخطة المجانية، فلا يتعطل عندما توقف Google نسخة قديمة.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
/**
 * نماذج بديلة (مفصولة بفواصل) تُجرّب بالترتيب إذا كان الأساسي مشغولاً (503) أو خلصت حصته (429).
 * لكل نموذج حصته الخاصة في الخطة المجانية.
 */
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.1-flash-lite")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

/** أقصى انتظار لأول كلمة من كل نموذج قبل الانتقال للبديل */
export const FIRST_TOKEN_TIMEOUT_MS = Number(process.env.GEMINI_FIRST_TOKEN_TIMEOUT_MS ?? 12_000);
/** أقصى مدة للطلب الواحد كاملاً (بما فيها البث) */
export const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000);

/** حدود الطلب (حماية من الرسائل الضخمة والتكلفة غير المتوقعة) */
export const MAX_MESSAGE_LENGTH = 1000;
/** نرسل آخر 8 رسائل فقط من المحادثة، وكل رسالة مقصوصة لطول معقول */
export const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 1200;
/** الرد نفسه قصير (2-6 أسطر حسب الـ system prompt) */
export const MAX_OUTPUT_TOKENS = 1024;

export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set");
    this.name = "MissingApiKeyError";
  }
}

/** كل النماذج مشغولة أو لم ترد في الوقت المحدد */
export class GeminiBusyError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "GeminiBusyError";
  }
}

let cached: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  if (!cached) {
    cached = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: REQUEST_TIMEOUT_MS,
        // بدون إعادة محاولة داخل الـ SDK: كانت تنتظر حتى دقيقة بين المحاولات عند 503.
        // نحن ننتقل مباشرة للنموذج البديل بدلاً من ذلك.
        retryOptions: { attempts: 1 },
      },
    });
  }
  return cached;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * ضغط مؤقت (500/503)، تجاوز حصة (429)، أو نموذج غير متاح لهذا المفتاح (404):
 * كلها أسباب للانتقال للنموذج التالي.
 */
function shouldTryNextModel(error: unknown): boolean {
  return error instanceof ApiError && [404, 429, 500, 503].includes(error.status);
}

export function isGeminiBusy(error: unknown): boolean {
  return error instanceof GeminiBusyError || (error instanceof ApiError && [429, 500, 503].includes(error.status));
}

export type GeminiTextStream = {
  model: string;
  /** زمن وصول أول كلمة بالملي ثانية */
  firstTokenMs: number;
  chunks: AsyncGenerator<string>;
};

/**
 * طلب Gemini واحد متدفق مع بديل سريع:
 * نفتح البث على النموذج الأساسي وننتظر أول كلمة؛ إذا رجع 503/429 أو تأخر أكثر من
 * FIRST_TOKEN_TIMEOUT_MS نلغيه وننتقل للنموذج التالي. لا يوجد إلا طلب واحد ناجح لكل رسالة.
 */
export async function streamGemini(
  request: Omit<GenerateContentParameters, "model">,
): Promise<GeminiTextStream> {
  const ai = getGeminiClient();
  const models = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
  const failures: string[] = [];

  for (const model of models) {
    const started = performance.now();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FIRST_TOKEN_TIMEOUT_MS);

    try {
      const stream = await ai.models.generateContentStream({
        ...request,
        model,
        config: { ...request.config, abortSignal: controller.signal },
      });
      const iterator = stream[Symbol.asyncIterator]();

      // ننتظر أول جزء فيه نص قبل ما نعتمد هذا النموذج
      let first = "";
      for (;;) {
        const next = await iterator.next();
        if (next.done) break;
        first = next.value.text ?? "";
        if (first) break;
      }
      clearTimeout(timer);
      const firstTokenMs = performance.now() - started;

      async function* chunks() {
        if (first) yield first;
        for (;;) {
          const next = await iterator.next();
          if (next.done) return;
          const text = next.value.text;
          if (text) yield text;
        }
      }

      return { model, firstTokenMs, chunks: chunks() };
    } catch (error) {
      clearTimeout(timer);
      if (timedOut) {
        failures.push(`${model}: no first token after ${FIRST_TOKEN_TIMEOUT_MS}ms`);
      } else if (shouldTryNextModel(error)) {
        failures.push(`${model}: ${(error as ApiError).status}`);
      } else {
        throw error;
      }
      console.warn(`[gemini] ${failures[failures.length - 1]} → trying next model`);
    }
  }

  throw new GeminiBusyError(failures.join("; "));
}

/** رسالة محادثة بصيغة Gemini (المساعد يُسمّى "model"). */
export type GeminiTurn = { role: "user" | "model"; parts: { text: string }[] };

export function toGeminiHistory(
  conversation: { role: "user" | "assistant"; content: string }[],
): GeminiTurn[] {
  const recent = conversation.slice(-MAX_HISTORY_MESSAGES);
  // Gemini يتوقع أن تبدأ المحادثة برسالة من المستخدم
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();
  return recent.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content.slice(0, MAX_HISTORY_CHARS) }],
  }));
}
