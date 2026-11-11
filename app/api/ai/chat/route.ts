import { z } from "zod";
import {
  MAX_MESSAGE_LENGTH,
  MAX_OUTPUT_TOKENS,
  MissingApiKeyError,
  isGeminiBusy,
  streamGemini,
  toGeminiHistory,
  type GeminiTextStream,
} from "@/lib/ai/gemini";
import { classifyGeneral } from "@/lib/ai/intent";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { buildGeneralPrompt, buildUserPrompt, type Lang } from "@/lib/ai/contextBuilder";
import { defaultQuickReplies, retrieve } from "@/lib/ai/retrieve";
import { checkRateLimit, clientKey } from "@/lib/ai/rateLimit";
import type { ChatStreamEvent, ChatStructuredData } from "@/lib/ai/chatTypes";
import { detectLanguage } from "@/lib/search/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(40)
    .optional()
    .default([]),
  language: z.enum(["ar", "en"]).optional(),
  /** false يرجع JSON كامل بدل البث */
  stream: z.boolean().optional().default(true),
});

const isDev = process.env.NODE_ENV !== "production";

/** Logging للتطوير فقط — لا يظهر في الإنتاج. */
function devLog(line: string) {
  if (isDev) console.info(line);
}

function perf(label: string, ms: number) {
  devLog(`[ai/perf] ${label}=${Math.round(ms)}ms`);
}

const UNAVAILABLE = {
  ar: "مساعد وينها غير متاح مؤقتاً، حاول مرة ثانية بعد شوية.",
  en: "The WAYNHA assistant is temporarily unavailable. Please try again shortly.",
};

const BUSY = {
  ar: "مساعد وينها مشغول حالياً، حاول مرة ثانية بعد شوية.",
  en: "The WAYNHA assistant is busy right now. Please try again shortly.",
};

function errorResponse(status: number, message: string, devMessage?: string) {
  return Response.json(
    { error: { message, ...(isDev && devMessage ? { devMessage } : {}) } },
    { status },
  );
}

/** لا نسجّل نص المستخدم ولا المفاتيح — فقط نوع الخطأ. */
function errorLabel(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message.slice(0, 160)}`;
  return "UnknownError";
}

/**
 * التدفق: بحث محلي/PostgreSQL → سياق مختصر → طلب Gemini واحد متدفق → الرد.
 * لا يوجد طلب Gemini منفصل لتحديد النية.
 */
export async function POST(request: Request) {
  const startedAt = performance.now();
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return Response.json(
      { error: { message: "طلبات كثيرة في وقت قصير. حاول مرة ثانية بعد شوية." } },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "طلب غير صالح.");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      `الرسالة غير صالحة. تأكد أنها مش فاضية وأقل من ${MAX_MESSAGE_LENGTH} حرف.`,
    );
  }

  const { message, conversation, stream: wantsStream } = parsed.data;
  const lang: Lang = parsed.data.language ?? detectLanguage(message);

  // لا نسجّل نص المستخدم نفسه — فقط طوله
  devLog(`[assistant] user message received (${message.length} chars, ${conversation.length} previous turns)`);

  try {
    // ── 1) تصنيف محلي: الأسئلة العامة لا تحتاج قاعدة البيانات ─────
    const general = classifyGeneral(message);

    let structured: ChatStructuredData;
    let userPrompt: string;

    if (general) {
      structured = {
        matchedService: null,
        offices: [],
        quickReplies: defaultQuickReplies(lang, false),
        requiresClarification: false,
      };
      userPrompt = buildGeneralPrompt({ question: message, lang, category: general });
      devLog(`[ai/chat] intent=${general} (local) → no database lookup`);
    } else {
      // ── 2) بحث PostgreSQL لإحضار سياق الخدمة ─────────────────
      const searchStarted = performance.now();
      const retrieval = await retrieve(message, conversation, lang);
      perf("db-search", performance.now() - searchStarted);

      structured = {
        matchedService: retrieval.matchedService,
        offices: retrieval.offices,
        quickReplies: retrieval.quickReplies,
        requiresClarification: retrieval.requiresClarification,
      };
      devLog(
        `[ai/chat] matchedService=${retrieval.matchedService?.id ?? "none"}` +
          `${retrieval.fromConversation ? " (from conversation)" : ""}` +
          `${retrieval.requiresClarification ? " (clarification)" : ""} offices=${retrieval.offices.length}`,
      );

      const buildStarted = performance.now();
      userPrompt = buildUserPrompt({
        question: message,
        lang,
        matched: retrieval.matchedService,
        fromConversation: retrieval.fromConversation,
        alternatives: retrieval.alternatives,
        offices: retrieval.offices,
        clarification: retrieval.clarification,
        asksAboutLocation: retrieval.wantsLocation,
      });
      perf("context-build", performance.now() - buildStarted);
    }

    // ── 3) طلب Gemini واحد متدفق (مع بديل سريع عند 503) ──────────
    const geminiStarted = performance.now();
    const gemini: GeminiTextStream = await streamGemini({
      contents: [
        ...toGeminiHistory(conversation),
        { role: "user" as const, parts: [{ text: userPrompt }] },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });
    perf("gemini-first-token", gemini.firstTokenMs);
    devLog(`[ai/chat] answering with google-gemini model=${gemini.model} (1 request)`);

    const headers = {
      "x-waynha-ai-provider": "google-gemini",
      "x-waynha-ai-model": gemini.model,
      "x-waynha-ai-calls": "1",
    };

    if (!wantsStream) {
      let text = "";
      for await (const chunk of gemini.chunks) text += chunk;
      perf("gemini-total", performance.now() - geminiStarted);
      perf("total", performance.now() - startedAt);
      text = text.trim();
      if (!text) return errorResponse(502, UNAVAILABLE[lang], "Gemini returned an empty response");
      return Response.json({ ...structured, message: text, model: gemini.model }, { headers });
    }

    // ── 4) بث الرد سطراً سطراً (NDJSON) ───────────────────────
    const encoder = new TextEncoder();
    const send = (controller: ReadableStreamDefaultController, event: ChatStreamEvent) =>
      controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

    const responseStream = new ReadableStream({
      async start(controller) {
        send(controller, { type: "meta", ...structured });
        try {
          let produced = false;
          for await (const text of gemini.chunks) {
            produced = true;
            send(controller, { type: "delta", text });
          }
          if (!produced) send(controller, { type: "error", message: UNAVAILABLE[lang] });
          send(controller, { type: "done" });
        } catch (error) {
          console.error("[ai/chat] stream failed:", errorLabel(error));
          send(controller, { type: "error", message: UNAVAILABLE[lang] });
        } finally {
          perf("gemini-total", performance.now() - geminiStarted);
          perf("total", performance.now() - startedAt);
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
        ...headers,
      },
    });
  } catch (error) {
    perf("total (failed)", performance.now() - startedAt);
    if (error instanceof MissingApiKeyError) {
      console.error(
        "[ai/chat] GEMINI_API_KEY مفقود — ضعه في .env.local ثم أعد تشغيل npm run dev",
      );
      return errorResponse(
        503,
        UNAVAILABLE[lang],
        "GEMINI_API_KEY غير موجود في .env.local. احصل على مفتاح من https://aistudio.google.com/apikey",
      );
    }
    console.error("[ai/chat] request failed:", errorLabel(error));
    if (isGeminiBusy(error)) {
      return errorResponse(503, BUSY[lang], errorLabel(error));
    }
    return errorResponse(500, UNAVAILABLE[lang]);
  }
}
