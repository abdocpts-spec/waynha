"use client";

import { useEffect, useRef } from "react";
import ChatInput from "@/components/assistant/ChatInput";
import ChatMessage from "@/components/assistant/ChatMessage";
import QuickReplies from "@/components/assistant/QuickReplies";
import { useAssistant } from "@/components/assistant/useAssistant";
import { t, type Lang, uiLang } from "@/lib/i18n";

const WELCOME: Record<"ar" | "en", string> = {
  ar: "السلام عليكم 👋\nأنا مساعد وينها.\nقولي شن الإجراء اللي تبي تعرف عليه ونحاول نوجهك.",
  en: "Hello 👋\nI'm the WAYNHA assistant.\nTell me which government procedure you need and I'll guide you.",
};

const STARTERS: Record<"ar" | "en", { label: string; message: string }[]> = {
  ar: [
    { label: "ضاع جوازي", message: "ضاع جوازي" },
    { label: "شن نحتاج لتجديد الرخصة؟", message: "شن نحتاج لتجديد الرخصة؟" },
    { label: "نبي شهادة ميلاد", message: "نبي شهادة ميلاد" },
    { label: "وين أقرب جهة؟", message: "وين أقرب جهة؟" },
  ],
  en: [
    { label: "I lost my passport", message: "I lost my passport" },
    { label: "How do I renew my license?", message: "How do I renew my license?" },
    { label: "I need a birth certificate", message: "I need a birth certificate" },
    { label: "Where is the nearest office?", message: "Where is the nearest office?" },
  ],
};

export default function ChatWindow({
  lang,
  initialQuestion,
}: {
  lang: Lang;
  initialQuestion?: string;
}) {
  const { messages, isLoading, quickReplies, send, retry } = useAssistant(lang);
  const bodyRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // إرسال السؤال القادم من الصفحة الرئيسية مرة واحدة
  useEffect(() => {
    if (initialQuestion && !started.current) {
      started.current = true;
      void send(initialQuestion);
    }
  }, [initialQuestion, send]);

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, quickReplies]);

  const replies = messages.length === 0 ? STARTERS[uiLang(lang)] : quickReplies;

  return (
    <div className="assistant-shell">
      <div className="assistant-head">
        <div className="assistant-avatar" aria-hidden="true">🤖</div>
        <div>
          <h1>{t(lang, "مساعد وينها", "WAYNHA Assistant")}</h1>
          <p>
            <span className="chat-status-dot" />
            {t(lang, "يجاوب من قاعدة بيانات وينها", "Answers from the WAYNHA database")}
          </p>
        </div>
      </div>

      <div className="assistant-body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon" aria-hidden="true">🤖</div>
            <h2>{t(lang, "مساعد وينها", "WAYNHA Assistant")}</h2>
            <p style={{ whiteSpace: "pre-line" }}>{WELCOME[uiLang(lang)]}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              lang={lang}
              isLast={index === messages.length - 1}
              onRetry={retry}
            />
          ))
        )}

        {replies.length > 0 && !isLoading && (
          <QuickReplies replies={replies} disabled={isLoading} onSelect={(message) => void send(message)} />
        )}
      </div>

      <ChatInput lang={lang} disabled={isLoading} onSend={(message) => void send(message)} />
    </div>
  );
}
