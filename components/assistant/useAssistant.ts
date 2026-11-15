"use client";

import { uiLang } from "@/lib/i18n";
import { useCallback, useRef, useState } from "react";
import type { ChatStreamEvent, ChatStructuredData, ChatTurn } from "@/lib/ai/chatTypes";
import type { Lang } from "@/lib/i18n";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** بيانات من قاعدة البيانات (خدمة مطابقة + جهات) تُعرض كبطاقة تحت الرد */
  data?: ChatStructuredData;
  status?: "streaming" | "done" | "error";
};

const FALLBACK_ERROR: Record<"ar" | "en", string> = {
  ar: "مساعد وينها غير متاح مؤقتاً، حاول مرة ثانية بعد شوية.",
  en: "The WAYNHA assistant is temporarily unavailable. Please try again shortly.",
};

let counter = 0;
const nextId = () => `m${Date.now()}-${counter++}`;

/**
 * يدير محادثة المساعد: الإرسال، البث التدريجي، حالة التحميل، والأخطاء.
 * كل الاتصال يتم مع /api/ai/chat — المتصفح لا يعرف شيئاً عن Gemini ولا عن المفتاح.
 */
export function useAssistant(lang: Lang) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<{ label: string; message: string }[]>([]);
  const lastQuestion = useRef<string | null>(null);
  /** قفل فوري (الـ state يتحدث بعد إعادة الرسم، فالضغط المزدوج السريع كان يرسل مرتين) */
  const inFlight = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || inFlight.current) return;
      inFlight.current = true;

      lastQuestion.current = question;
      setQuickReplies([]);
      setIsLoading(true);

      const conversation: ChatTurn[] = messages
        .filter((message) => message.status !== "error" && message.text.trim().length > 0)
        .map((message) => ({ role: message.role, content: message.text }));

      const assistantId = nextId();
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "user", text: question },
        { id: assistantId, role: "assistant", text: "", status: "streaming" },
      ]);

      const update = (patch: Partial<ChatMessage>) =>
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? { ...message, ...patch } : message)),
        );

      if (process.env.NODE_ENV !== "production") {
        console.info("[assistant] user message received");
        console.info("[assistant] sending to /api/ai/chat");
      }

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: question, conversation, language: uiLang(lang), siteLang: lang }),
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          const message =
            (payload as { error?: { message?: string } } | null)?.error?.message ??
            FALLBACK_ERROR[uiLang(lang)];
          update({ text: message, status: "error" });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        const handle = (event: ChatStreamEvent) => {
          if (event.type === "meta") {
            const { type: _type, ...data } = event;
            void _type;
            update({ data });
            setQuickReplies(data.quickReplies ?? []);
          } else if (event.type === "delta") {
            answer += event.text;
            update({ text: answer });
          } else if (event.type === "error") {
            update({ text: answer ? `${answer}\n\n${event.message}` : event.message, status: "error" });
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line) {
              try {
                handle(JSON.parse(line) as ChatStreamEvent);
              } catch {
                // سطر ناقص أو غير صالح — نتجاهله
              }
            }
            newline = buffer.indexOf("\n");
          }
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  status: message.status === "error" ? "error" : "done",
                  text: message.text || FALLBACK_ERROR[uiLang(lang)],
                }
              : message,
          ),
        );
      } catch {
        update({ text: FALLBACK_ERROR[uiLang(lang)], status: "error" });
      } finally {
        inFlight.current = false;
        setIsLoading(false);
      }
    },
    [lang, messages],
  );

  /** إعادة المحاولة: نحذف آخر رد فاشل ونعيد إرسال نفس السؤال. */
  const retry = useCallback(() => {
    const question = lastQuestion.current;
    if (!question || inFlight.current) return;
    setMessages((current) => {
      const trimmed = [...current];
      while (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
      if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "user") trimmed.pop();
      return trimmed;
    });
    // نؤجل الإرسال حتى تُحدَّث الرسائل
    setTimeout(() => void send(question), 0);
  }, [send]);

  const reset = useCallback(() => {
    setMessages([]);
    setQuickReplies([]);
    lastQuestion.current = null;
  }, []);

  return { messages, isLoading, quickReplies, send, retry, reset };
}
