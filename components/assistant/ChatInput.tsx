"use client";

import { useEffect, useRef, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

const MAX_LENGTH = 1000;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

/** صندوق الكتابة: Enter للإرسال، Shift+Enter لسطر جديد، وزر ميكروفون اختياري. */
export default function ChatInput({
  lang,
  disabled,
  onSend,
}: {
  lang: Lang;
  disabled: boolean;
  onSend: (message: string) => void;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  };

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError(true);
      return;
    }
    setSpeechError(false);

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = lang === "ar" ? "ar-LY" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("");
      setValue(transcript.slice(0, MAX_LENGTH));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  return (
    <div className="assistant-foot">
      <div className="composer">
        <button
          type="button"
          className={`composer-btn secondary${listening ? " listening" : ""}`}
          onClick={toggleMic}
          disabled={disabled}
          aria-label={t(lang, "إدخال صوتي", "Voice input")}
          title={t(lang, "إدخال صوتي", "Voice input")}
        >
          🎤
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder={t(lang, "اكتب سؤالك هنا...", "Type your question…")}
          aria-label={t(lang, "رسالة لمساعد وينها", "Message to the WAYNHA assistant")}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="composer-btn"
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          aria-label={t(lang, "إرسال", "Send")}
        >
          <span className="send-arrow" aria-hidden="true">➤</span>
        </button>
      </div>
      <p className="composer-hint">
        {speechError
          ? t(
              lang,
              "الإدخال الصوتي غير مدعوم في هذا المتصفح — جرّب Chrome أو Edge.",
              "Voice input isn't supported in this browser — try Chrome or Edge.",
            )
          : t(
              lang,
              "Enter للإرسال · Shift + Enter لسطر جديد · وينها منصة إرشادية وليست جهة حكومية",
              "Enter to send · Shift + Enter for a new line · WAYNHA is a guide, not a government entity",
            )}
      </p>
    </div>
  );
}
