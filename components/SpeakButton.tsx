"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/lib/i18n";

/**
 * زر «استمع»: قراءة النص بصوت المتصفح (Text-to-Speech) بدون إرسال أي شيء لخادم خارجي.
 * يختفي إذا كان المتصفح لا يدعم القراءة الصوتية.
 */
export default function SpeakButton({
  text,
  lang,
  compact = false,
}: {
  text: string;
  lang: Lang;
  compact?: boolean;
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const code = lang === "ar" ? "ar" : "en";
    utterance.lang = code === "ar" ? "ar-SA" : "en-US";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(code));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  const label = speaking ? t(lang, "إيقاف القراءة", "Stop reading") : t(lang, "استمع", "Listen");
  return (
    <button
      type="button"
      className={`btn-outline speak-btn${compact ? " speak-compact" : ""}`}
      onClick={toggle}
      aria-pressed={speaking}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{speaking ? "⏹" : "🔊"}</span> {compact ? null : label}
    </button>
  );
}
