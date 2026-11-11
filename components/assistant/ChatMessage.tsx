"use client";

import AIServiceCard from "@/components/assistant/AIServiceCard";
import TypingIndicator from "@/components/assistant/TypingIndicator";
import type { ChatMessage as Message } from "@/components/assistant/useAssistant";
import { t, type Lang } from "@/lib/i18n";

/**
 * فقاعة رسالة واحدة.
 * نص الذكاء الاصطناعي يُعرض كنص عادي (بدون dangerouslySetInnerHTML)،
 * فأي HTML يرجع من النموذج يظهر كنص ولا يُنفّذ.
 */
export default function ChatMessage({
  message,
  lang,
  isLast,
  onRetry,
}: {
  message: Message;
  lang: Lang;
  isLast: boolean;
  onRetry: () => void;
}) {
  const isUser = message.role === "user";
  const showTyping = message.status === "streaming" && message.text.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className={`chat-row${isUser ? " user" : ""}`}>
        <div className="chat-avatar" aria-hidden="true">{isUser ? "👤" : "🤖"}</div>
        {showTyping ? (
          <div className="bubble" style={{ padding: 0 }}>
            <TypingIndicator />
            <span className="sr-only">{t(lang, "جاري الكتابة", "Typing")}</span>
          </div>
        ) : (
          <div className={`bubble${message.status === "error" ? " error" : ""}`}>{message.text}</div>
        )}
      </div>

      {!isUser && message.data?.matchedService && (
        <div className="chat-row">
          <div className="chat-avatar" style={{ visibility: "hidden" }} aria-hidden="true" />
          <AIServiceCard
            service={message.data.matchedService}
            offices={message.data.offices}
            lang={lang}
          />
        </div>
      )}

      {!isUser && message.status === "error" && isLast && (
        <div className="chat-row">
          <div className="chat-avatar" style={{ visibility: "hidden" }} aria-hidden="true" />
          <button type="button" className="btn-outline" onClick={onRetry}>
            🔄 {t(lang, "إعادة المحاولة", "Try again")}
          </button>
        </div>
      )}
    </div>
  );
}
