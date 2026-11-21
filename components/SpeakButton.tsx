"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/lib/i18n";

/** أفضل صوت متاح للغة: العربية (أولوية للعربية السعودية/المصرية) أو الإنجليزية. */
function pickVoice(code: "ar" | "en"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(code));
  if (code === "en") return voices[0];
  const prefer = ["ar-sa", "ar-eg", "ar-ae"];
  return (
    prefer.map((p) => voices.find((v) => v.lang.toLowerCase() === p)).find(Boolean) ?? voices[0]
  );
}

/**
 * زر «استمع»: قراءة النص بصوت المتصفح (Text-to-Speech) بدون إرسال أي شيء لخادم خارجي.
 * - يقرأ بالعربية عندما تكون اللغة عربية (ويختار صوتاً عربياً إن وُجد على الجهاز).
 * - `parts` تُقرأ واحدة بعد الأخرى بنفس الترتيب (مثلاً خطوة بخطوة)، وهذا أدق من نص طويل واحد.
 * - يختفي إذا كان المتصفح لا يدعم القراءة الصوتية.
 */
export default function SpeakButton({
  text,
  parts,
  lang,
  compact = false,
}: {
  text?: string;
  parts?: string[];
  lang: Lang;
  compact?: boolean;
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const run = useRef(0); // رقم الجلسة الحالية؛ يلغي القراءة القديمة عند الإيقاف

  useEffect(() => {
    return () => {
      run.current += 1;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const queue = (parts ?? (text ? [text] : [])).map((p) => p.trim()).filter(Boolean);
  if (!supported || queue.length === 0) return null;

  function stop() {
    run.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function start() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const id = ++run.current;
    const code = lang === "ar" ? "ar" : "en";
    const voice = pickVoice(code);
    setNoVoice(code === "ar" && synth.getVoices().length > 0 && !voice);
    setSpeaking(true);

    const next = (index: number) => {
      if (run.current !== id) return;
      if (index >= queue.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(queue[index]);
      utterance.lang = voice?.lang ?? (code === "ar" ? "ar-SA" : "en-US");
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => next(index + 1);
      utterance.onerror = () => {
        if (run.current === id) setSpeaking(false);
      };
      synth.speak(utterance);
    };
    next(0);
  }

  const label = speaking ? t(lang, "إيقاف القراءة", "Stop reading") : t(lang, "استمع", "Listen");
  return (
    <>
      <button
        type="button"
        className={`btn-outline speak-btn${compact ? " speak-compact" : ""}`}
        onClick={speaking ? stop : start}
        aria-pressed={speaking}
        aria-label={label}
        title={label}
      >
        <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span> {compact ? null : label}
      </button>
      {noVoice && (
        <span className="speak-note" role="status">
          {t(
            lang,
            "جهازك لا يحتوي صوتاً عربياً. أضِف صوتاً عربياً من إعدادات النظام (الكلام / Speech) ليُقرأ بالعربية.",
            "No Arabic voice found on this device.",
          )}
        </span>
      )}
    </>
  );
}
